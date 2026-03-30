import { collection, doc, getDocs, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Normalizes raw leave type strings from HR exports to system types.
 */
const normalizeLeaveType = (raw) => {
    const type = raw?.toString().toUpperCase().trim();
    if (type.includes('EL')) return 'EL';
    if (type.includes('CO') || type.includes('COMP')) return 'CO';
    if (type.includes('CF')) return 'CF';
    if (type.includes('MR') || type.includes('MATERNITY')) return 'MR';
    if (type.includes('PFH')) return 'PFH';
    if (type.includes('WFH')) return 'WFH';
    return null;
};

/**
 * Parsed date from "21-Apr-25 Mon" format
 */
const parseHRDate = (raw) => {
    if (!raw) return null;
    const dateStr = raw.toString().split(' ')[0]; // Strip " Mon", " Tue", etc.
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const months = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };

    const day = parseInt(parts[0]);
    const month = months[parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()];
    let year = parseInt(parts[2]);

    if (isNaN(day) || month === undefined || isNaN(year)) return null;

    // Handle 2-digit years
    if (year < 100) year += 2000;

    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Categorizes the transaction based on remarks and day counts.
 */
const categorizeTransaction = (record) => {
    const remarks = record.remarks?.toLowerCase() || '';
    if (remarks.includes('auto increment')) {
        return 'monthly_increment';
    }
    if (record.consumedDays > 0) return 'leave_taken';
    if (record.creditDays > 0) return 'credit';
    return 'adjustment';
};

/**
 * Generates a composite key for deduplication.
 */
export const generateCompositeKey = (l) => {
    const dateStr = l.date instanceof Date ? l.date.toISOString().split('T')[0] : l.date;
    const category = l.leaveType || l.category || 'EL';
    const type = l.transactionType || (l.type === 'Credit' ? 'credit' : 'leave_taken');
    const mag = Math.abs(l.days || l.consumedDays || l.creditDays || 0);
    return `${dateStr}_${category}_${type}_${mag}`;
};

/**
 * Parses HR Export (XLS/XLSX)
 */
export const parseHRExport = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                const records = [];
                let currentLeaveType = null;

                for (const row of rows) {
                    const firstCell = row[1]?.toString().trim(); // Column B has Leave Type/Names
                    const dateCell = row[6]?.toString().trim(); // Column G has Date
                    const remarksCell = row[7]?.toString().trim() || ''; // Column H has Remarks

                    // Skip Header Rows/Footers
                    if (firstCell?.includes('My Info > My Leave Register')) continue;
                    if (firstCell?.startsWith('Employee :')) continue;
                    if (firstCell === 'Total' || firstCell === 'Muster Data') continue;

                    // Identifying section headers (e.g., "EL - Earned Leave")
                    if (firstCell && firstCell.includes(' - ')) {
                        const potential = normalizeLeaveType(firstCell);
                        if (potential) currentLeaveType = potential;
                        continue;
                    }

                    // Date parsing and validation
                    const date = parseHRDate(dateCell);
                    if (!date) continue;

                    // Processing Remarks
                    let cleanRemarks = remarksCell;
                    let consumedDays = parseFloat(row[3]) || 0;
                    const creditDays = parseFloat(row[4]) || 0;

                    // Half-Day Detection Rule
                    if (remarksCell.startsWith('Early going (Out Cutoff) |')) {
                        cleanRemarks = remarksCell.replace('Early going (Out Cutoff) |', '').trim();
                        consumedDays = 0.5;
                    }

                    // HR Recorded Logic (FROM WEB HR)
                    if (remarksCell.includes('FROM WEB HR')) {
                        cleanRemarks = "Recorded by HR";
                    }

                    const record = {
                        leaveType: currentLeaveType || normalizeLeaveType(firstCell),
                        openingBalance: parseFloat(row[2]) || 0,
                        consumedDays,
                        creditDays,
                        closingBalance: parseFloat(row[5]) || 0,
                        date,
                        remarks: cleanRemarks,
                        source: 'hr_export'
                    };

                    if (record.leaveType) {
                        record.transactionType = categorizeTransaction(record);
                        records.push(record);
                    }
                }
                resolve(records);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Parses Template Import (CSV)
 */
export const parseCSVTemplate = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const records = results.data.map(row => ({
                    date: new Date(row.Date),
                    leaveType: normalizeLeaveType(row.LeaveType),
                    transactionType: row.TransactionType,
                    consumedDays: row.TransactionType === 'leave_taken' ? parseFloat(row.Days) : 0,
                    creditDays: (row.TransactionType === 'credit' || row.TransactionType === 'monthly_increment') ? parseFloat(row.Days) : 0,
                    remarks: row.Remarks || '',
                    source: 'csv_import'
                })).filter(r => r.leaveType && !isNaN(r.date.getTime()));
                resolve(records);
            },
            error: (err) => reject(err)
        });
    });
};

/**
 * Main import function with batching and deduplication
 */
export const importToFirestore = async (userId, records, onProgress) => {
    if (!userId) throw new Error("Authentication required");

    const historyRef = collection(db, 'users', userId, 'leaveHistory');
    const existingSnapshot = await getDocs(historyRef);
    const existingKeys = new Set(existingSnapshot.docs.map(doc => {
        const d = doc.data();
        return generateCompositeKey({
            date: d.date.toDate(),
            leaveType: d.leaveType,
            transactionType: d.transactionType,
            consumedDays: d.consumedDays,
            creditDays: d.creditDays
        });
    }));

    const seenInBatch = new Set();
    const newRecords = records.filter(r => {
        const key = generateCompositeKey(r);
        if (existingKeys.has(key)) return false;
        if (seenInBatch.has(key)) return false;
        seenInBatch.add(key);
        return true;
    });
    const skippedCount = records.length - newRecords.length;

    // Batching (max 500)
    const BATCH_SIZE = 500;
    let importedCount = 0;

    for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = newRecords.slice(i, i + BATCH_SIZE);

        chunk.forEach(record => {
            const docRef = doc(historyRef);
            batch.set(docRef, {
                ...record,
                id: docRef.id,
                date: Timestamp.fromDate(record.date),
                importedAt: serverTimestamp(),
                schemaVersion: 1
            });
        });

        await batch.commit();
        importedCount += chunk.length;
        if (onProgress) onProgress(Math.round((importedCount / newRecords.length) * 100));
    }

    // Update Metadata
    const metaRef = doc(db, 'users', userId, 'importMeta', 'leaveImport');
    const batch = writeBatch(db);
    batch.set(metaRef, {
        lastImportedAt: serverTimestamp(),
        totalRecords: (existingSnapshot.size || 0) + importedCount
    }, { merge: true });
    await batch.commit();
    return { importedCount: (newRecords.length), skippedCount };
};

/**
     * Deletes all leave history records for a user from Firestore.
     */
export const clearLeaveHistory = async (userId) => {
    if (!userId) throw new Error("Authentication required");

    const historyRef = collection(db, 'users', userId, 'leaveHistory');
    const snapshot = await getDocs(historyRef);

    if (snapshot.empty) return;

    const BATCH_SIZE = 500;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + BATCH_SIZE);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }

    // Reset Metadata
    const metaRef = doc(db, 'users', userId, 'importMeta', 'leaveImport');
    const batch = writeBatch(db);
    batch.set(metaRef, {
        lastImportedAt: serverTimestamp(),
        totalRecords: 0
    }, { merge: true });
    await batch.commit();
};

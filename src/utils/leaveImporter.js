import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getFinancialYearStartYear } from './financialYear';

/**
 * Normalizes raw leave type strings from HR exports to system types.
 */
const normalizeLeaveType = (raw) => {
    const type = raw?.toString().toUpperCase().trim();
    if (!type) return null;
    if (type.includes('EL')) return 'EL';
    if (type.includes('CO') || type.includes('COMP')) return 'CO';
    if (type.includes('CF')) return 'CF';
    if (type.includes('MR') || type.includes('MATERNITY')) return 'MR';
    if (type.includes('PFH')) return 'PFH';
    if (type.includes('WFH')) return 'WFH';
    return null;
};

const parseCellNumber = (raw) => {
    if (raw === null || raw === undefined) return 0;
    const cleaned = raw
        .toString()
        .replace(/\u00a0/g, ' ')
        .replace(/,/g, '')
        .trim();

    if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'nbsp') return 0;

    const numericOnly = cleaned.replace(/[^\d.-]/g, '');
    if (!numericOnly) return 0;

    const value = parseFloat(numericOnly);
    return Number.isFinite(value) ? value : 0;
};

const normalizeTransactionType = (rawType, record = {}) => {
    const type = (rawType || '').toString().toLowerCase().trim();
    if (type === 'credit' || type === 'monthly_increment') return 'credit';
    if (type === 'debit' || type === 'leave_taken') return 'debit';

    const creditDays = Number(record.creditDays || 0);
    const consumedDays = Number(record.consumedDays || 0);
    const days = Number(record.days || 0);

    if (creditDays > 0) return 'credit';
    if (consumedDays > 0) return 'debit';
    if (days < 0) return 'credit';
    return 'debit';
};

const sanitizeRemark = (remark) => {
    if (!remark) return '';
    return remark
        .toString()
        .replace(/\[#.*?#\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Parse date from "21-Apr-25 Mon" and "21-Apr-25\nMon" style values.
 */
const parseHRDate = (raw) => {
    if (!raw) return null;
    const dateMatch = raw.toString().match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
    if (!dateMatch) return null;

    const months = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };

    const day = dateMatch[1].padStart(2, '0');
    const month = months[dateMatch[2].charAt(0).toUpperCase() + dateMatch[2].slice(1).toLowerCase()];
    let year = parseInt(dateMatch[3], 10);

    if (month === undefined || Number.isNaN(year)) return null;
    if (year < 100) year += 2000;

    return `${year}-${month}-${day}`;
};

/**
 * Generates a composite key for deduplication.
 */
export const generateCompositeKey = (record) => {
    const getLocalDateString = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        const date = value instanceof Date ? value : (value.toDate ? value.toDate() : new Date(value));
        if (Number.isNaN(date.getTime())) return '';
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const dateStr = getLocalDateString(record.transactionDate || record.date);
    const leaveType = record.leaveType || record.category || 'EL';
    const transactionType = normalizeTransactionType(record.transactionType, record);
    const magnitude = Math.abs(Number(record.days || record.consumedDays || record.creditDays || 0));
    return `${dateStr}_${leaveType}_${transactionType}_${magnitude}`;
};

const parseLegacyHtmlExport = (htmlString) => {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(htmlString, 'text/html');
    const rows = [...documentNode.querySelectorAll('tr')];

    if (rows.length === 0) {
        throw new Error('No valid table rows found in the provided file.');
    }

    const employeeCell = [...documentNode.querySelectorAll('td,th')]
        .find((cell) => /employee\s*:/i.test(cell.textContent || ''));
    const employeeName = employeeCell
        ? (employeeCell.textContent || '').split(/\s*:\s*/).slice(1).join(':').trim()
        : '';

    const balancesByType = new Map();
    const records = [];
    let currentLeaveType = null;

    rows.forEach((row) => {
        const className = (row.getAttribute('class') || '').toLowerCase();
        const cells = [...row.querySelectorAll('th,td')];
        if (cells.length === 0) return;

        const values = cells.map((cell) =>
            (cell.textContent || '')
                .replace(/\u00a0/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
        );
        const rowText = values.join(' ').toLowerCase();

        if (rowText.includes('my info > my leave register')) return;
        if (rowText.includes('employee :')) return;
        if (rowText.includes('transaction date') && rowText.includes('user leave type')) return;
        if (className.includes('custsubheader1') || rowText === 'muster data') return;

        const firstCellColspan = Number(cells[0]?.getAttribute('colspan') || 0);
        if (cells.length === 1 && firstCellColspan >= 8) return; // spacer row

        const leaveType = normalizeLeaveType(values[1] || values[0]);
        const openingBalance = parseCellNumber(values[2]);
        const consumedDays = parseCellNumber(values[3]);
        const creditDays = parseCellNumber(values[4]);
        const availableBalance = parseCellNumber(values[5]);
        const transactionDate = parseHRDate(values[6] || '');
        const rawRemark = values[7] || '';

        // Summary rows: keep for leaveBalances, don't import as transactions.
        if (leaveType && !transactionDate) {
            balancesByType.set(leaveType, {
                leaveType,
                openingBalance,
                totalConsumed: consumedDays,
                totalCredited: creditDays,
                availableBalance,
            });
            currentLeaveType = leaveType;
            return;
        }

        if (!transactionDate) return;

        const resolvedLeaveType = leaveType || currentLeaveType;
        if (!resolvedLeaveType) return;
        if (consumedDays > 0 && creditDays > 0) return;

        const transactionType = creditDays > 0 ? 'credit' : 'debit';
        const days = creditDays > 0 ? creditDays : consumedDays;
        if (days <= 0) return;

        const isAutoAdjustment = /\[adjustment\]/i.test(rawRemark);
        const remark = sanitizeRemark(rawRemark);

        records.push({
            leaveType: resolvedLeaveType,
            transactionType,
            openingBalance,
            days,
            closingBalance: availableBalance,
            transactionDate,
            date: transactionDate, // backward compatibility
            remark,
            remarks: remark, // backward compatibility
            isAutoAdjustment,
            consumedDays: transactionType === 'debit' ? days : 0,
            creditDays: transactionType === 'credit' ? days : 0,
            source: 'legacy_hrms_import',
            type: transactionType === 'credit' ? 'Credit' : (days === 0.5 ? 'Half Day' : 'Full Day')
        });
    });

    return {
        employeeName,
        records,
        leaveBalances: Array.from(balancesByType.values())
    };
};

const parseWorkbookExport = async (file) => {
    const data = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });

    const balancesByType = new Map();
    const records = [];
    let currentLeaveType = null;
    let employeeName = '';

    for (const row of rows) {
        const rowText = row.map((cell) => (cell ?? '').toString()).join(' ').toLowerCase();
        if (!employeeName && rowText.includes('employee :')) {
            const source = row.find((cell) => /employee\s*:/i.test((cell || '').toString()));
            employeeName = (source || '').toString().split(/\s*:\s*/).slice(1).join(':').trim();
        }

        const firstCellRaw = row[1] ?? row[0];
        const firstCell = firstCellRaw?.toString().trim();
        const leaveType = normalizeLeaveType(firstCell);
        const transactionDate = parseHRDate((row[6] ?? '').toString().trim());
        const rawRemark = (row[7] ?? '').toString().trim();

        if (rowText.includes('my info > my leave register')) continue;
        if (rowText.includes('employee :')) continue;
        if (rowText.includes('transaction date') && rowText.includes('user leave type')) continue;
        if (firstCell === 'Muster Data' || firstCell === 'Total') continue;

        const openingBalance = parseCellNumber(row[2]);
        const consumedDays = parseCellNumber(row[3]);
        const creditDays = parseCellNumber(row[4]);
        const availableBalance = parseCellNumber(row[5]);

        if (leaveType && !transactionDate) {
            balancesByType.set(leaveType, {
                leaveType,
                openingBalance,
                totalConsumed: consumedDays,
                totalCredited: creditDays,
                availableBalance
            });
            currentLeaveType = leaveType;
            continue;
        }

        if (!transactionDate) continue;

        const resolvedLeaveType = leaveType || currentLeaveType;
        if (!resolvedLeaveType) continue;
        if (consumedDays > 0 && creditDays > 0) continue;

        const transactionType = creditDays > 0 ? 'credit' : 'debit';
        const days = creditDays > 0 ? creditDays : consumedDays;
        if (days <= 0) continue;

        const isAutoAdjustment = /\[adjustment\]/i.test(rawRemark);
        const remark = sanitizeRemark(rawRemark);

        records.push({
            leaveType: resolvedLeaveType,
            transactionType,
            openingBalance,
            days,
            closingBalance: availableBalance,
            transactionDate,
            date: transactionDate, // backward compatibility
            remark,
            remarks: remark,
            isAutoAdjustment,
            consumedDays: transactionType === 'debit' ? days : 0,
            creditDays: transactionType === 'credit' ? days : 0,
            source: 'legacy_hrms_import',
            type: transactionType === 'credit' ? 'Credit' : (days === 0.5 ? 'Half Day' : 'Full Day')
        });
    }

    return {
        employeeName,
        records,
        leaveBalances: Array.from(balancesByType.values())
    };
};

/**
 * Parses HR export. Supports both:
 * - HTML tables saved with .xls extension
 * - Real XLS/XLSX workbook files
 */
export const parseHRExport = async (file) => {
    const textContent = await file.text();
    if (/<table[\s>]/i.test(textContent)) {
        return parseLegacyHtmlExport(textContent);
    }
    return parseWorkbookExport(file);
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
                const records = results.data.map((row) => {
                    const parsedDate = new Date(row.Date);
                    const y = parsedDate.getFullYear();
                    const m = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
                    const d = parsedDate.getDate().toString().padStart(2, '0');
                    const transactionDate = !Number.isNaN(parsedDate.getTime()) ? `${y}-${m}-${d}` : null;

                    const leaveType = normalizeLeaveType(row.LeaveType);
                    const transactionType = normalizeTransactionType(row.TransactionType, {});
                    const days = Math.abs(parseCellNumber(row.Days));
                    if (!leaveType || !transactionDate || days <= 0) return null;

                    const remark = sanitizeRemark(row.Remarks || '');

                    return {
                        leaveType,
                        transactionType,
                        openingBalance: parseCellNumber(row.OpeningBalance),
                        days,
                        closingBalance: parseCellNumber(row.ClosingBalance),
                        transactionDate,
                        date: transactionDate, // backward compatibility
                        remark,
                        remarks: remark,
                        isAutoAdjustment: /\[adjustment\]/i.test(row.Remarks || ''),
                        consumedDays: transactionType === 'debit' ? days : 0,
                        creditDays: transactionType === 'credit' ? days : 0,
                        source: 'csv_import',
                        type: transactionType === 'credit' ? 'Credit' : (days === 0.5 ? 'Half Day' : 'Full Day')
                    };
                }).filter(Boolean);

                resolve(records);
            },
            error: (err) => reject(err)
        });
    });
};

const normalizeRecordForFirestore = (record, sourceOverride) => {
    const leaveType = normalizeLeaveType(record.leaveType || record.category || record.userLeaveType || '');
    if (!leaveType) return null;

    const transactionDate = record.transactionDate || record.date;
    if (!transactionDate) return null;

    const transactionType = normalizeTransactionType(record.transactionType, record);
    const magnitude = Math.abs(Number(record.days || record.consumedDays || record.creditDays || 0));
    if (!Number.isFinite(magnitude) || magnitude <= 0) return null;

    const consumedDays = transactionType === 'debit' ? magnitude : 0;
    const creditDays = transactionType === 'credit' ? magnitude : 0;
    const rawRemark = record.remark || record.remarks || '';
    const remark = sanitizeRemark(rawRemark);

    return {
        leaveType,
        transactionType,
        openingBalance: Number(record.openingBalance || 0),
        days: magnitude,
        closingBalance: Number(record.closingBalance || 0),
        transactionDate,
        date: transactionDate, // compatibility for existing sync code
        remark,
        remarks: remark, // compatibility for existing sync code
        isAutoAdjustment: typeof record.isAutoAdjustment === 'boolean'
            ? record.isAutoAdjustment
            : /\[adjustment\]/i.test(rawRemark),
        consumedDays,
        creditDays,
        source: record.source || sourceOverride || 'legacy_hrms_import',
        type: transactionType === 'credit' ? 'Credit' : (magnitude === 0.5 ? 'Half Day' : 'Full Day')
    };
};

/**
 * Main import function with batching and deduplication
 */
export const importToFirestore = async (userId, records, onProgress, importMeta = {}) => {
    if (!userId) throw new Error('Authentication required');

    const historyRef = collection(db, 'users', userId, 'leaveHistory');
    const existingSnapshot = await getDocs(historyRef);

    const normalizedRecords = records
        .map((record) => normalizeRecordForFirestore(record, importMeta.source))
        .filter(Boolean);

    const importedFYs = new Set(
        normalizedRecords
            .map((record) => getFinancialYearStartYear(record.transactionDate || record.date))
            .filter(Number.isFinite)
    );

    let removedExistingCount = 0;
    const replaceFinancialYears = Boolean(importMeta.replaceFinancialYears);

    if (replaceFinancialYears && importedFYs.size > 0) {
        const docsToDelete = existingSnapshot.docs.filter((docSnap) => {
            const data = docSnap.data();
            const fy = getFinancialYearStartYear(data.transactionDate || data.date);
            return importedFYs.has(fy);
        });

        if (docsToDelete.length > 0) {
            const BATCH_SIZE = 500;
            for (let i = 0; i < docsToDelete.length; i += BATCH_SIZE) {
                const deleteBatch = writeBatch(db);
                const chunk = docsToDelete.slice(i, i + BATCH_SIZE);
                chunk.forEach((docSnap) => deleteBatch.delete(docSnap.ref));
                await deleteBatch.commit();
            }
            removedExistingCount = docsToDelete.length;
        }
    }

    const existingKeys = new Set(
        existingSnapshot.docs
            .filter((docSnap) => {
                if (!replaceFinancialYears || importedFYs.size === 0) return true;
                const data = docSnap.data();
                const fy = getFinancialYearStartYear(data.transactionDate || data.date);
                return !importedFYs.has(fy);
            })
            .map((docSnap) => {
                const data = docSnap.data();
                return generateCompositeKey({
                    ...data,
                    date: data.date,
                    transactionDate: data.transactionDate
                });
            })
    );

    const seenInBatch = new Set();
    const newRecords = normalizedRecords.filter((record) => {
        const key = generateCompositeKey(record);
        if (existingKeys.has(key)) return false;
        if (seenInBatch.has(key)) return false;
        seenInBatch.add(key);
        return true;
    });
    const skippedCount = normalizedRecords.length - newRecords.length;

    const BATCH_SIZE = 500;
    let importedCount = 0;

    for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = newRecords.slice(i, i + BATCH_SIZE);

        chunk.forEach((record) => {
            const docRef = doc(historyRef);
            batch.set(docRef, {
                ...record,
                id: docRef.id,
                importedAt: serverTimestamp(),
                schemaVersion: 2
            });
        });

        await batch.commit();
        importedCount += chunk.length;
        if (onProgress && newRecords.length > 0) {
            onProgress(Math.round((importedCount / newRecords.length) * 100));
        }
    }

    if (importMeta.leaveBalances?.length) {
        const leaveBalancesRef = collection(db, 'users', userId, 'leaveBalances');
        const balanceBatch = writeBatch(db);
        let hasWrites = false;

        importMeta.leaveBalances.forEach((balance) => {
            const leaveType = normalizeLeaveType(balance.leaveType || balance.category || '');
            if (!leaveType) return;

            const docRef = doc(leaveBalancesRef, leaveType);
            balanceBatch.set(docRef, {
                leaveType,
                openingBalance: Number(balance.openingBalance || 0),
                totalConsumed: Number(balance.totalConsumed || 0),
                totalCredited: Number(balance.totalCredited || 0),
                availableBalance: Number(balance.availableBalance || 0),
                employeeName: importMeta.employeeName || null,
                lastUpdated: serverTimestamp(),
                source: importMeta.source || 'legacy_hrms_import'
            }, { merge: true });
            hasWrites = true;
        });

        if (hasWrites) {
            await balanceBatch.commit();
        }
    }

    const metaRef = doc(db, 'users', userId, 'importMeta', 'leaveImport');
    const metaBatch = writeBatch(db);
    metaBatch.set(metaRef, {
        lastImportedAt: serverTimestamp(),
        totalRecords: (existingSnapshot.size || 0) - removedExistingCount + importedCount,
        employeeName: importMeta.employeeName || null,
        replacedFinancialYears: Array.from(importedFYs).sort((a, b) => a - b)
    }, { merge: true });
    await metaBatch.commit();

    return { importedCount: newRecords.length, skippedCount };
};

/**
 * Deletes all leave history records for a user from Firestore.
 */
export const clearLeaveHistory = async (userId) => {
    if (!userId) throw new Error('Authentication required');

    const historyRef = collection(db, 'users', userId, 'leaveHistory');
    const snapshot = await getDocs(historyRef);
    if (snapshot.empty) return;

    const BATCH_SIZE = 500;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + BATCH_SIZE);
        chunk.forEach((document) => batch.delete(document.ref));
        await batch.commit();
    }

    const metaRef = doc(db, 'users', userId, 'importMeta', 'leaveImport');
    const batch = writeBatch(db);
    batch.set(metaRef, {
        lastImportedAt: serverTimestamp(),
        totalRecords: 0
    }, { merge: true });
    await batch.commit();
};

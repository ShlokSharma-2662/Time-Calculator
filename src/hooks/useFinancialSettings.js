import { useState, useEffect } from 'react';

// --- Passcode Hashing ---
async function hashPasscode(passcode) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passcode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const STORAGE_KEY = 'financial_settings_data';

const DEFAULT_SETTINGS = {
    annualCTC: 690000,
    basicPercentOfGross: 51.6,
    transportAllowance: 3300,
    ptDeduction: 200,
    pfCapping: 1800,
};

export function useFinancialSettings() {
    const [settings, setSettings] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    });

    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        return localStorage.getItem('financial_privacy_mode') === 'true';
    });

    const [hasPasscode, setHasPasscode] = useState(() => {
        return !!localStorage.getItem('financial_passcode');
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('financial_privacy_mode', isPrivacyMode);
    }, [isPrivacyMode]);

    const togglePrivacy = async (passcodeFromUser) => {
        if (!isPrivacyMode) {
            // Turning privacy ON doesn't need passcode
            setIsPrivacyMode(true);
            return true;
        }

        // Turning privacy OFF (revealing) needs passcode if set
        const storedHash = localStorage.getItem('financial_passcode');
        if (!storedHash) {
            setIsPrivacyMode(false);
            return true;
        }
        const inputHash = await hashPasscode(passcodeFromUser);
        if (inputHash === storedHash) {
            setIsPrivacyMode(false);
            return true;
        }
        return false;
    };

    const setPasscode = async (newPasscode) => {
        if (!newPasscode) {
            localStorage.removeItem('financial_passcode');
            setHasPasscode(false);
        } else {
            const hashed = await hashPasscode(newPasscode);
            localStorage.setItem('financial_passcode', hashed);
            setHasPasscode(true);
        }
    };

    const updateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    // Calculated derived values
    const monthlyCTC = settings.annualCTC / 12;
    const employerPF = settings.pfCapping;
    const grossMonthly = monthlyCTC - employerPF;
    const basic = (grossMonthly * settings.basicPercentOfGross) / 100;
    const hra = basic * 0.40;
    const cca = grossMonthly - basic - hra - settings.transportAllowance;
    const employeePF = settings.pfCapping;
    const netPay = grossMonthly - employeePF - settings.ptDeduction;

    const financialData = {
        monthlyCTC,
        grossMonthly,
        basic,
        hra,
        cca,
        transport: settings.transportAllowance,
        employeePF,
        pt: settings.ptDeduction,
        netPay,
        annualCTC: settings.annualCTC
    };

    return {
        settings,
        updateSettings,
        financialData,
        isPrivacyMode,
        togglePrivacy,
        hasPasscode,
        setPasscode
    };
}

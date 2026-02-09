import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ELEncashmentCalculator } from './ELEncashmentCalculator';
import { SandwichLeaveChecker } from './SandwichLeaveChecker';
import { SmartAnalytics } from './SmartAnalytics';

export function LeaveManagement() {
    const [currentLeave, setCurrentLeave] = useState(null);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            {/* Smart Analytics Module */}
            <SmartAnalytics currentLeave={currentLeave} />

            {/* Module 1: EL Encashment Calculator */}
            <ELEncashmentCalculator />

            {/* Module 2: Sandwich Leave Checker */}
            <SandwichLeaveChecker onLeaveChange={setCurrentLeave} />

            {/* Info Footer */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4"
            >
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    <strong>Note:</strong> These calculations are for reference only. Please verify with your HR department
                    for official leave policies and encashment rules applicable to FY 2025-26.
                </p>
            </motion.div>
        </motion.div>
    );
}

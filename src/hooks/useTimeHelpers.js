export const useTimeHelpers = () => {
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const minutesToTime = (totalMinutes, use24Hour = false) => {
        let minutes = totalMinutes % (24 * 60);
        if (minutes < 0) minutes += 24 * 60;

        const h = Math.floor(minutes / 60);
        const m = Math.floor(minutes % 60);

        if (use24Hour) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }

        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const formatDuration = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    return { timeToMinutes, minutesToTime, formatDuration };
};

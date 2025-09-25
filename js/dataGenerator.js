/**
 * Data Generator Module
 * Generates sample version data for the chart
 */

export class DataGenerator {
    constructor() {
        this.startDate = new Date(2025, 8, 23); // Sept 23, 2025
        this.endDate = new Date(2026, 8, 23);   // Sept 23, 2026
        this.totalDays = Math.floor((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
        this.versionCount = 4;
    }

    /**
     * Generate sample data for the chart
     */
    generateData() {
        const data = [];

        for (let i = 0; i < this.versionCount; i++) {
            // Publication date spread across the year
            let publishDayOffset = Math.floor(i * this.totalDays / (this.versionCount - 1)) + Math.random() * 30 - 15;
            publishDayOffset = Math.max(0, Math.min(publishDayOffset, this.totalDays - 90));

            const publishDate = new Date(this.startDate.getTime() + publishDayOffset * 24 * 60 * 60 * 1000);

            // Version start date (must be >= publication date)
            const versionStartOffset = publishDayOffset + Math.random() * 30;
            let versionStart = new Date(this.startDate.getTime() + versionStartOffset * 24 * 60 * 60 * 1000);

            // Ensure version start is never before publication date
            if (versionStart < publishDate) {
                versionStart = new Date(publishDate.getTime());
            }

            // Version end date (must be > start date)
            const versionDuration = 30 + Math.random() * 90;
            let versionEnd = new Date(versionStart.getTime() + versionDuration * 24 * 60 * 60 * 1000);

            // Ensure we don't exceed chart bounds
            if (versionEnd > this.endDate) {
                versionEnd = new Date(this.endDate.getTime());
                if (versionEnd <= versionStart) {
                    versionEnd = new Date(versionStart.getTime() + 24 * 60 * 60 * 1000);
                }
            }

            const versionName = "v" + (i + 1);

            data.push({
                category: "Version " + (i + 1),
                version: versionName, // This is the field we'll use for labels
                open: versionStart.getTime(),
                close: versionEnd.getTime(),
                publishDate: publishDate.getTime(),
                publishDateFormatted: publishDate.toLocaleDateString(),
                validityStartFormatted: versionStart.toLocaleDateString(),
                validityEndFormatted: versionEnd.toLocaleDateString()
            });
        }

        return data;
    }

    /**
     * Generate data with custom parameters
     */
    generateCustomData(options = {}) {
        const {
            versionCount = 4,
            startDate = new Date(2025, 8, 23),
            endDate = new Date(2026, 8, 23)
        } = options;

        this.versionCount = versionCount;
        this.startDate = startDate;
        this.endDate = endDate;
        this.totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

        return this.generateData();
    }
}

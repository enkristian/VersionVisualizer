/**
 * ---------------------------------------
 * This demo was created using amCharts 5.
 *
 * For more information visit:
 * https://www.amcharts.com/
 *
 * Documentation is available at:
 * https://www.amcharts.com/docs/v5/
 * ---------------------------------------
 */

// Global variables
var root, chart, xAxis, yAxis, series;
var chartData = []; // Store chart data globally for updates

/**
 * Initialize the chart root element and themes
 */
function initializeRoot() {
    // Create root element
    // https://www.amcharts.com/docs/v5/getting-started/#Root_element
    root = am5.Root.new("chartdiv");

    // Set themes
    // https://www.amcharts.com/docs/v5/concepts/themes/
    root.setThemes([
        am5themes_Animated.new(root)
    ]);
}

/**
 * Create the main XY chart with configuration
 */
function createChart() {
    // Create chart
    // https://www.amcharts.com/docs/v5/charts/xy-chart/
    chart = root.container.children.push(am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelX: "panX",
        wheelY: "zoomX",
        pinchZoomX: true,
        paddingLeft: 0
    }));
}

/**
 * Add cursor functionality to the chart
 */
function addCursor() {
    // Add cursor
    // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
    var cursor = chart.set("cursor", am5xy.XYCursor.new(root, {}));
    cursor.lineY.set("visible", true);
}

/**
 * Create and configure the X and Y axes
 */
function createAxes() {
    // Create X-axis renderer for dates
    var xRenderer = am5xy.AxisRendererX.new(root, {
        minGridDistance: 50,
        minorGridEnabled: true
    });
    xRenderer.labels.template.setAll({
        rotation: -45,
        centerY: am5.p50,
        centerX: am5.p100
    });
    xRenderer.grid.template.setAll({
        visible: true
    });

    // Create X-axis (Date axis for publication dates)
    xAxis = chart.xAxes.push(am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: "day", count: 1 },
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {})
    }));

    // Set X-axis date range
    xAxis.set("min", new Date(2025, 7, 23).getTime()); // Aug 23, 2025
    xAxis.set("max", new Date(2026, 7, 23).getTime()); // Aug 23, 2026

    // Create Y-axis (Date axis for timeline)
    yAxis = chart.yAxes.push(am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: "day", count: 1 },
        renderer: am5xy.AxisRendererY.new(root, {})
    }));

    // Set Y-axis date range
    yAxis.set("min", new Date(2025, 8, 23).getTime()); // Sept 23, 2025
    yAxis.set("max", new Date(2026, 8, 23).getTime()); // Sept 23, 2026
}

/**
 * Create and configure the column series
 */
function createSeries() {
    // Create series
    // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
    series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name: "Series 1",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "close",
        openValueYField: "open",
        valueXField: "publishDate", // Changed from categoryXField to valueXField for DateAxis
        tooltip: am5.Tooltip.new(root, {
            labelText: "Version {version}\nPublished: {publishDateFormatted}\nValid: {validityStartFormatted} - {validityEndFormatted}"
        })
    }));

    // Configure column width
    series.columns.template.setAll({
        width: 4 // Increased width for better visibility on date axis
    });
}

/**
 * Add bullet points to the series
 */
function addBullets() {
    // Add bullets for start points
    series.bullets.push(function() {
        return am5.Bullet.new(root, {
            locationY: 0,
            sprite: am5.Circle.new(root, {
                radius: 5,
                fill: series.get("fill")
            })
        });
    });

    // Add bullets for end points
    var nextColor = chart.get("colors").getIndex(1);
    series.bullets.push(function() {
        return am5.Bullet.new(root, {
            locationY: 1,
            sprite: am5.Circle.new(root, {
                radius: 5,
                fill: nextColor
            })
        });
    });
}

/**
 * Generate sample data for the chart
 */
function generateData() {
    var data = [];
    var startDate = new Date(2025, 8, 23); // Sept 23, 2025
    var endDate = new Date(2026, 8, 23);   // Sept 23, 2026
    var totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    var versionCount = 4; // Number of versions to generate

    for (var i = 0; i < versionCount; i++) {
        // Publication date spread across the year
        var publishDayOffset = Math.floor(i * totalDays / (versionCount - 1)) + Math.random() * 30 - 15;
        publishDayOffset = Math.max(0, Math.min(publishDayOffset, totalDays - 90));

        var publishDate = new Date(startDate.getTime() + publishDayOffset * 24 * 60 * 60 * 1000);

        // Version start date (must be >= publication date)
        var versionStartOffset = publishDayOffset + Math.random() * 30; // 0-30 days after publication
        var versionStart = new Date(startDate.getTime() + versionStartOffset * 24 * 60 * 60 * 1000);

        // Ensure version start is never before publication date
        if (versionStart < publishDate) {
            versionStart = new Date(publishDate.getTime());
        }

        // Version end date (must be > start date)
        var versionDuration = 30 + Math.random() * 90; // Duration 30-120 days
        var versionEnd = new Date(versionStart.getTime() + versionDuration * 24 * 60 * 60 * 1000);

        // Ensure we don't exceed chart bounds
        if (versionEnd > endDate) {
            versionEnd = new Date(endDate.getTime());
            if (versionEnd <= versionStart) {
                versionEnd = new Date(versionStart.getTime() + 24 * 60 * 60 * 1000);
            }
        }

        data.push({
            category: "Version " + (i + 1),
            version: "v" + (i + 1) + ".0",
            open: versionStart.getTime(),   // Y-axis: Version start date (as timestamp)
            close: versionEnd.getTime(),    // Y-axis: Version end date (as timestamp)
            publishDate: publishDate.getTime(),
            publishDateFormatted: publishDate.toLocaleDateString(),
            validityStartFormatted: versionStart.toLocaleDateString(),
            validityEndFormatted: versionEnd.toLocaleDateString()
        });
    }

    return data;
}

/**
 * Update the first version data with new dates
 */
function updateFirstVersion(publishDate, startDate, endDate) {
    if (chartData.length > 0) {
        chartData[0].publishDate = publishDate.getTime();
        chartData[0].open = startDate.getTime();
        chartData[0].close = endDate.getTime();
        chartData[0].publishDateFormatted = publishDate.toLocaleDateString();
        chartData[0].validityStartFormatted = startDate.toLocaleDateString();
        chartData[0].validityEndFormatted = endDate.toLocaleDateString();

        // Update chart with new data
        setData(chartData);
    }
}

/**
 * Convert date to YYYY-MM-DD format for input fields
 */
function dateToInputFormat(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Initialize form controls with current version 1 data
 */
function initializeFormControls() {
    if (chartData.length > 0) {
        var version1 = chartData[0];

        // Set form values
        document.getElementById('publishDate').value = dateToInputFormat(new Date(version1.publishDate));
        document.getElementById('startDate').value = dateToInputFormat(new Date(version1.open));
        document.getElementById('endDate').value = dateToInputFormat(new Date(version1.close));

        // Add event listeners
        document.getElementById('publishDate').addEventListener('change', handleDateChange);
        document.getElementById('startDate').addEventListener('change', handleDateChange);
        document.getElementById('endDate').addEventListener('change', handleDateChange);
    }
}

/**
 * Handle date input changes
 */
function handleDateChange() {
    var publishDateInput = document.getElementById('publishDate').value;
    var startDateInput = document.getElementById('startDate').value;
    var endDateInput = document.getElementById('endDate').value;

    if (publishDateInput && startDateInput && endDateInput) {
        var publishDate = new Date(publishDateInput);
        var startDate = new Date(startDateInput);
        var endDate = new Date(endDateInput);

        // Validate dates
        if (startDate < publishDate) {
            alert('Start date cannot be before published date');
            document.getElementById('startDate').value = dateToInputFormat(publishDate);
            startDate = publishDate;
        }

        if (endDate <= startDate) {
            alert('End date must be after start date');
            var minEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
            document.getElementById('endDate').value = dateToInputFormat(minEndDate);
            endDate = minEndDate;
        }

        // Update chart
        updateFirstVersion(publishDate, startDate, endDate);
    }
}

/**
 * Set data on axes and series
 */
function setData(data) {
    // Set data on axes and series
    xAxis.data.setAll(data);
    series.data.setAll(data);
}

/**
 * Apply animations to the chart
 */
function applyAnimations() {
    // Make stuff animate on load
    // https://www.amcharts.com/docs/v5/concepts/animations/
    series.appear(1000);
    chart.appear(1000, 100);
}

/**
 * Initialize the complete chart by calling all setup methods in order
 */
function initializeChart() {
    // Step 1: Initialize root and themes
    initializeRoot();

    // Step 2: Create the main chart
    createChart();

    // Step 3: Add cursor functionality
    addCursor();

    // Step 4: Create and configure axes
    createAxes();

    // Step 5: Create the data series
    createSeries();

    // Step 6: Add visual bullets
    addBullets();

    // Step 7: Generate and set data
    var data = generateData();
    setData(data);
    chartData = data; // Store generated data for updates

    // Step 8: Initialize form controls
    initializeFormControls();

    // Step 9: Apply animations
    applyAnimations();
}

// Initialize the chart when the script loads
initializeChart();

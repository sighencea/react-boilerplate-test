document.addEventListener('DOMContentLoaded', function () {
    const staffTableBody = document.getElementById('staffTableBody');
    const mainContent = document.getElementById('mainContent'); // Scroll container

    if (!staffTableBody) {
        console.warn('Staff table body (staffTableBody) for lazy loading not found.');
        return;
    }
    if (!mainContent) {
        console.warn('#mainContent element not found. Cannot attach scroll listener for staff lazy loading.');
        return;
    }

    const allRows = Array.from(staffTableBody.children); // Assuming children are all <tr>
    let rowsCurrentlyVisible = 0;

    const initialBufferRows = 5;
    const minimumInitialRows = 10;
    const rowsPerScrollLoad = 10;

    // Initially hide all rows
    allRows.forEach(row => {
        row.style.display = 'none';
    });

    function performInitialStaffLoad() {
        console.log('Performing initial staff load...');
        console.log(`mainContent.clientHeight: ${mainContent.clientHeight}px`);
        if (allRows.length > 0 && allRows[0]) {
            console.log(`Height of a typical row (allRows[0].offsetHeight): ${allRows[0].offsetHeight}px`);
        }

        let scrollbarAppeared = false;
        let rowsVisibleBeforeScrollbarCheck = 0;

        for (let i = 0; i < allRows.length; i++) {
            allRows[i].style.display = ''; // Or 'table-row'
            rowsCurrentlyVisible++;
            rowsVisibleBeforeScrollbarCheck = rowsCurrentlyVisible;

            if (rowsCurrentlyVisible >= minimumInitialRows && mainContent.scrollHeight > mainContent.clientHeight) {
                console.log(`Scrollbar condition met for staff table: mainContent.scrollHeight (${mainContent.scrollHeight}px) > mainContent.clientHeight (${mainContent.clientHeight}px)`);
                console.log(`Rows made visible one by one before scrollbar check: ${rowsVisibleBeforeScrollbarCheck}`);
                scrollbarAppeared = true;
                
                let bufferLoaded = 0;
                for (let j = i + 1; j < allRows.length && bufferLoaded < initialBufferRows; j++) {
                    allRows[j].style.display = ''; 
                    rowsCurrentlyVisible++;
                    bufferLoaded++;
                }
                console.log(`Loaded ${bufferLoaded} buffer rows for staff table.`);
                break; 
            }
        }

        if (!scrollbarAppeared) {
            if (rowsCurrentlyVisible > 0) {
                console.log(`All ${rowsCurrentlyVisible} staff rows loaded initially, no scrollbar detected (or minimumInitialRows not met for check).`);
            } else if (allRows.length > 0) {
                console.warn('No staff rows made visible in initial load, but rows exist.');
            }
        }
        
        console.log(`Total staff rows made visible by performInitialStaffLoad (including buffer): ${rowsCurrentlyVisible}`);
        const moreToLoad = rowsCurrentlyVisible < allRows.length;
        console.log(`Will scroll listener be added for staff table? ${moreToLoad}`);
        return moreToLoad; 
    }

    function loadMoreRows() {
        console.log('loadMoreRows (staff) triggered.');
        console.log(`Staff rows currently visible before adding more: ${rowsCurrentlyVisible}`);

        if (rowsCurrentlyVisible >= allRows.length) {
            mainContent.removeEventListener('scroll', scrollHandler);
            return;
        }

        let newRowsLoadedCount = 0;
        for (let i = rowsCurrentlyVisible; i < allRows.length && newRowsLoadedCount < rowsPerScrollLoad; i++) {
            allRows[i].style.display = ''; 
            rowsCurrentlyVisible++;
            newRowsLoadedCount++;
        }
        console.log(`Number of new staff rows added: ${newRowsLoadedCount}`);
        console.log(`Total staff rows visible after adding more: ${rowsCurrentlyVisible}`);

        if (rowsCurrentlyVisible >= allRows.length) {
            console.log('All staff members have been lazy-loaded.');
            mainContent.removeEventListener('scroll', scrollHandler);
        }
    }

    let scrollTimeout;
    const scrollHandler = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrollableHeight = mainContent.scrollHeight - mainContent.clientHeight;
            const currentScrollTop = mainContent.scrollTop;
            const buffer = 100; 

            if (currentScrollTop >= (scrollableHeight - buffer) || scrollableHeight < buffer) {
                loadMoreRows();
            }
        }, 50); 
    };

    if (allRows.length > 0) {
        if (performInitialStaffLoad()) { 
            console.log('Scroll listener attached for lazy loading remaining staff rows.');
            mainContent.addEventListener('scroll', scrollHandler, { passive: true });
        } else {
            console.log('All staff rows fit in viewport or were loaded initially. No scroll listener needed.');
        }
    } else {
        console.warn('No rows found in staffTableBody to lazy load.');
    }
});

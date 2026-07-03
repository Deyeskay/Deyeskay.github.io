document.addEventListener('DOMContentLoaded', () => {
    // --- State DOM Elements Selection Matrix ---
    const goldPriceInput = document.getElementById('goldPrice');
    const goldQtyInput = document.getElementById('goldQty');
    const loanAmountInput = document.getElementById('loanAmount');
    const interestRateSlider = document.getElementById('interestRate');
    const interestRateValLabel = document.getElementById('interestRateVal');
    const loanDurationSelect = document.getElementById('loanDuration');
    
    const toggleTabs = document.querySelectorAll('.toggle-tab');
    const targetPriceGroup = document.getElementById('targetPriceGroup');
    const targetPctGroup = document.getElementById('targetPctGroup');
    const futurePriceInput = document.getElementById('futurePrice');
    const growthPctInput = document.getElementById('growthPct');
    
    const estCostTodayLabel = document.getElementById('estCostToday');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const themeToggle = document.getElementById('themeToggle');
    const resultsSection = document.getElementById('resultsSection');
    
    // Output Elements Interface Matrix
    const comparisonVerdictCard = document.getElementById('comparisonVerdictCard');
    const resCostToday = document.getElementById('resCostToday');
    const resLoanAmt = document.getElementById('resLoanAmt');
    const resInterest = document.getElementById('resInterest');
    const resTotalRepay = document.getElementById('resTotalRepay');
    const resFutureVal = document.getElementById('resFutureVal');
    const resNetProfit = document.getElementById('resNetProfit');
    const resFuturePricePerG = document.getElementById('resFuturePricePerG');
    const resFutureCost = document.getElementById('resFutureCost');
    const waitExplanation = document.getElementById('waitExplanation');
    const bePrice = document.getElementById('bePrice');
    const bePct = document.getElementById('bePct');
    const beStatement = document.getElementById('beStatement');
    
    // Accordion Table Elements
    const toggleAccordion = document.getElementById('toggleAccordion');
    const accordionCard = toggleAccordion.closest('.accordion-card');
    const tablePrincipal = document.getElementById('tablePrincipal');
    const tableRate = document.getElementById('tableRate');
    const tableInterest = document.getElementById('tableInterest');
    const tableTotal = document.getElementById('tableTotal');
    const tableMonthlyInterest = document.getElementById('tableMonthlyInterest');
    const tableCostPerGram = document.getElementById('tableCostPerGram');
    
    const insightsContainer = document.getElementById('insightsContainer');
    const shareBtn = document.getElementById('shareBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const toast = document.getElementById('toast');

    let currentChartInstance = null;
    let selectedExpectationMode = 'targetPrice'; // Options: targetPrice | targetPct

    // --- Currency Formatting Infrastructure (Indian Numerical Standard Formatting) ---
    const formatCurrency = (num) => {
        const rounded = Math.round(num);
        return '₹' + rounded.toLocaleString('en-IN');
    };

    const formatPercent = (num) => {
        return num.toFixed(1) + '%';
    };

    // --- Core State LocalStorage Management ---
    const initLocalStorageCache = () => {
        if(localStorage.getItem('goldPrice')) goldPriceInput.value = localStorage.getItem('goldPrice');
        if(localStorage.getItem('goldQty')) goldQtyInput.value = localStorage.getItem('goldQty');
        if(localStorage.getItem('interestRate')) {
            interestRateSlider.value = localStorage.getItem('interestRate');
            interestRateValLabel.textContent = `${localStorage.getItem('interestRate')}%`;
        }
        if(localStorage.getItem('loanDuration')) loanDurationSelect.value = localStorage.getItem('loanDuration');
        if(localStorage.getItem('appTheme')) {
            document.body.setAttribute('data-theme', localStorage.getItem('appTheme'));
            updateThemeIcon(localStorage.getItem('appTheme'));
        }
        updateEstimatedCostToday();
    };

    const saveStateToLocalStorage = () => {
        localStorage.setItem('goldPrice', goldPriceInput.value);
        localStorage.setItem('goldQty', goldQtyInput.value);
        localStorage.setItem('interestRate', interestRateSlider.value);
        localStorage.setItem('loanDuration', loanDurationSelect.value);
    };

    // --- UI/UX Interactive Styling Features ---
    const updateThemeIcon = (theme) => {
        const icon = themeToggle.querySelector('i');
        if(theme === 'light') {
            icon.className = 'fa-solid fa-moon';
        } else {
            icon.className = 'fa-solid fa-sun';
        }
    };

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('appTheme', newTheme);
        updateThemeIcon(newTheme);
        if(!resultsSection.classList.contains('hidden')) {
            executeCalculations(); // Redraws chart color metrics matching theme rules
        }
    });

    // Ripple Tap Processing Engine
    const applyRippleEffect = (e, element) => {
        const circle = document.createElement('span');
        const diameter = Math.max(element.clientWidth, element.clientHeight);
        const radius = diameter / 2;
        
        const rect = element.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');
        
        const prevRipple = element.querySelector('.ripple');
        if (prevRipple) prevRipple.remove();
        
        element.appendChild(circle);
    };

    // Dual Tab Selection Handling Engine
    toggleTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            toggleTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedExpectationMode = tab.getAttribute('data-target');

            if(selectedExpectationMode === 'targetPrice') {
                targetPriceGroup.classList.add('active');
                targetPctGroup.classList.remove('active');
                synchronizeExpectationValues('pctToPrice');
            } else {
                targetPriceGroup.classList.remove('active');
                targetPctGroup.classList.add('active');
                synchronizeExpectationValues('priceToPct');
            }
        });
    });

    // Synchronize Future Price & Growth Percent Values
    const synchronizeExpectationValues = (direction) => {
        const currentPrice = parseFloat(goldPriceInput.value) || 0;
        const durationMonths = parseInt(loanDurationSelect.value) || 12;
        const years = durationMonths / 12;

        if (direction === 'pctToPrice' && currentPrice > 0) {
            const annualPct = parseFloat(growthPctInput.value) || 0;
            // Compound or linear expansion projection matching simple timeline limits
            const compoundFuturePrice = currentPrice * (1 + (annualPct / 100) * years);
            futurePriceInput.value = Math.round(compoundFuturePrice);
        } else if (direction === 'priceToPct' && currentPrice > 0) {
            const futurePrice = parseFloat(futurePriceInput.value) || 0;
            const absoluteGrowthPct = ((futurePrice - currentPrice) / currentPrice) * 100;
            const annualizedGrowthPct = absoluteGrowthPct / years;
            growthPctInput.value = isNaN(annualizedGrowthPct) ? 0 : annualizedGrowthPct.toFixed(1);
        }
    };

    // Reactive Updates Matrix
    const updateEstimatedCostToday = () => {
        const price = parseFloat(goldPriceInput.value) || 0;
        const qty = parseFloat(goldQtyInput.value) || 0;
        const totalCost = price * qty;
        estCostTodayLabel.textContent = formatCurrency(totalCost);
        return totalCost;
    };

    const autoSuggestLoanAmount = () => {
        const estimatedCost = updateEstimatedCostToday();
        loanAmountInput.value = Math.round(estimatedCost);
    };

    // Event Triggers mapping input changes dynamically
    goldPriceInput.addEventListener('input', () => {
        autoSuggestLoanAmount();
        synchronizeExpectationValues(selectedExpectationMode === 'targetPrice' ? 'priceToPct' : 'pctToPrice');
    });
    goldQtyInput.addEventListener('input', updateEstimatedCostToday);
    interestRateSlider.addEventListener('input', (e) => {
        interestRateValLabel.textContent = `${e.target.value}%`;
    });
    loanDurationSelect.addEventListener('change', () => {
        synchronizeExpectationValues(selectedExpectationMode === 'targetPrice' ? 'priceToPct' : 'pctToPrice');
    });
    futurePriceInput.addEventListener('input', () => synchronizeExpectationValues('priceToPct'));
    growthPctInput.addEventListener('input', () => synchronizeExpectationValues('pctToPrice'));

    // Accordion Control Toggle
    toggleAccordion.addEventListener('click', () => {
        accordionCard.classList.toggle('open');
    });

    // --- Calculation Core Business Logic Engine ---
    const executeCalculations = () => {
        // Parse current variables safely
        const currentPrice = parseFloat(goldPriceInput.value) || 0;
        const quantity = parseFloat(goldQtyInput.value) || 0;
        const loanAmount = parseFloat(loanAmountInput.value) || 0;
        const annualRate = parseFloat(interestRateSlider.value) || 0;
        const durationMonths = parseInt(loanDurationSelect.value) || 12;

        if(selectedExpectationMode === 'targetPct') {
            synchronizeExpectationValues('pctToPrice');
        }
        const futurePrice = parseFloat(futurePriceInput.value) || 0;

        if(currentPrice <= 0 || quantity <= 0 || loanAmount <= 0) {
            alert("Please input valid metrics greater than zero to properly evaluate execution strategy.");
            return;
        }

        // Formula Architect Processes
        const goldCostToday = currentPrice * quantity;
        const interestPaid = loanAmount * (annualRate / 100) * (durationMonths / 12);
        const totalRepayment = loanAmount + interestPaid;
        const nonLoanSelfFundedComponent = Math.max(0, goldCostToday - loanAmount);
        const absoluteOutflowBuyNow = totalRepayment + nonLoanSelfFundedComponent;

        const futureGoldValue = futurePrice * quantity;
        const costToBuyLater = futureGoldValue;

        const netProfitLossBuyNow = futureGoldValue - absoluteOutflowBuyNow;
        const netProfitLossWait = 0; // Asset baseline assumes current liquidity holding patterns

        // Break Even Calculations
        // Absolute liability balance equation to establish parity: (Price * Qty) = Total Outflow
        const breakEvenFuturePrice = absoluteOutflowBuyNow / quantity;
        const breakEvenPct = ((breakEvenFuturePrice - currentPrice) / currentPrice) * 100;

        // UI Allocation Transformations
        resCostToday.textContent = formatCurrency(goldCostToday);
        resLoanAmt.textContent = formatCurrency(loanAmount);
        resInterest.textContent = formatCurrency(interestPaid);
        resTotalRepay.textContent = formatCurrency(totalRepayment);
        resFutureVal.textContent = formatCurrency(futureGoldValue);
        
        resNetProfit.textContent = formatCurrency(netProfitLossBuyNow);
        resNetProfit.className = netProfitLossBuyNow >= 0 ? 'fw-700 text-success' : 'fw-700 text-danger';

        resFuturePricePerG.textContent = formatCurrency(futurePrice);
        resFutureCost.textContent = formatCurrency(costToBuyLater);

        // Core Analysis Engine Comparison Output
        const savingsDelta = Math.abs(costToBuyLater - absoluteOutflowBuyNow);
        
        if (absoluteOutflowBuyNow < costToBuyLater) {
            // Option A Borrow Strategy Win Pattern
            comparisonVerdictCard.className = "card verdict-card better-loan";
            comparisonVerdictCard.innerHTML = `<i class="fa-solid fa-circle-check"></i> Buying now with a loan saves ${formatCurrency(savingsDelta)} over waiting!`;
            waitExplanation.innerHTML = `Waiting forces an <span class="text-danger fw-600">extra cash injection of ${formatCurrency(savingsDelta)}</span> to capture the same physical quantity later.`;
        } else {
            // Option B Waiting Cash Conservation Strategy Win Pattern
            comparisonVerdictCard.className = "card verdict-card better-wait";
            comparisonVerdictCard.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Waiting and purchasing later saves ${formatCurrency(savingsDelta)}!`;
            waitExplanation.innerHTML = `Taking the loan costs an <span class="text-danger fw-600">extra ${formatCurrency(savingsDelta)}</span> in interest liabilities relative to market expansion rates.`;
        }

        // Break Even Formatting Output updates
        bePrice.textContent = `${formatCurrency(breakEvenFuturePrice)} / g`;
        bePct.textContent = formatPercent(breakEvenPct);
        beStatement.textContent = `If gold market capitalization rises higher than ${formatPercent(breakEvenPct)} (${formatCurrency(breakEvenFuturePrice)}/g) within the ${durationMonths} month timeline, executing the loan right now is computationally more profitable.`;

        // Accordion Data Bindings
        tablePrincipal.textContent = formatCurrency(loanAmount);
        tableRate.textContent = `${annualRate}% Simple Interest`;
        tableInterest.textContent = formatCurrency(interestPaid);
        tableTotal.textContent = formatCurrency(totalRepayment);
        tableMonthlyInterest.textContent = `${formatCurrency(interestPaid / durationMonths)} / Mo`;
        tableCostPerGram.textContent = `${formatCurrency(absoluteOutflowBuyNow / quantity)} / g`;

        // Insights Matrix Core Evaluation
        generateSmartInsights(breakEvenPct, interestPaid, annualRate, futurePrice, currentPrice, absoluteOutflowBuyNow, costToBuyLater);

        // Chart Data Object Dispatcher
        renderComparisonChart(absoluteOutflowBuyNow, futureGoldValue, costToBuyLater);

        resultsSection.classList.remove('hidden');
        saveStateToLocalStorage();

        // Smooth scroll view context targeting viewport
        setTimeout(() => {
            comparisonVerdictCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
    };

    // --- Smart Strategy Rule Insights Engine ---
    const generateSmartInsights = (breakEvenPct, interestPaid, annualRate, futurePrice, currentPrice, totalOutflow, costLater) => {
        insightsContainer.innerHTML = ''; // Fresh DOM Wipe
        const insights = [];

        insights.push(`Gold spot price needs to increase by at least <strong>${formatPercent(breakEvenPct)}</strong> for this structural debt strategy to break perfectly even.`);
        insights.push(`Your calculated debt structure accrues <strong>${formatCurrency(interestPaid)}</strong> in pure unrecoverable interest cost over the timeline.`);

        const estimatedGrowthAbsoluteRate = ((futurePrice - currentPrice) / currentPrice) * 100;
        
        if (estimatedGrowthAbsoluteRate > breakEvenPct) {
            insights.push(`Strategic Match: The expected appreciation rate (<strong>${formatPercent(estimatedGrowthAbsoluteRate)}</strong>) exceeds the break-even ceiling. <strong>Taking the loan appears financially beneficial.</strong>`);
        } else {
            insights.push(`Warning Action: Total interest debt drag outpaces projected market appreciation velocity. <strong>Waiting to self-fund later appears optimal.</strong>`);
        }

        if (annualRate > 12) {
            insights.push(`Risk Note: The assigned interest profile of ${annualRate}% resides above standard premium collateral loan terms. Audit options for lower options below 10.5%.`);
        }

        // Append Node arrays directly
        insights.forEach(insightStr => {
            const li = document.createElement('li');
            li.innerHTML = insightStr;
            insightsContainer.appendChild(li);
        });
    };

    // --- Chart JS Implementation Matrix ---
    const renderComparisonChart = (outflowNow, assetValueLater, outflowLater) => {
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        
        const labelColor = isDark ? '#9fa0b2' : '#616770';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        if(currentChartInstance) {
            currentChartInstance.destroy();
        }

        const ctxCanvas = document.getElementById('comparisonChart').getContext('2d');
        
        currentChartInstance = new Chart(ctxCanvas, {
            type: 'bar',
            data: {
                labels: ['Buy Now Strategy', 'Wait & Buy Strategy', 'End Asset Value'],
                datasets: [{
                    label: 'Capital Value (₹)',
                    data: [outflowNow, outflowLater, assetValueLater],
                    backgroundColor: [
                        'rgba(212, 175, 55, 0.75)',  // Gold Accent
                        'rgba(74, 144, 226, 0.75)',  // Accent Blue
                        'rgba(46, 125, 50, 0.75)'    // Green Capital Success
                    ],
                    borderColor: [
                        '#D4AF37',
                        '#4a90e2',
                        '#2e7d32'
                    ],
                    borderWidth: 1.5,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' Value: ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: labelColor, font: { family: 'Poppins', size: 10 } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { 
                            color: labelColor, 
                            font: { family: 'Poppins', size: 9 },
                            callback: function(value) { return '₹' + (value/1000) + 'k'; }
                        }
                    }
                }
            }
        });
    };

    // --- CTA Interaction Wireframing Events ---
    calculateBtn.addEventListener('click', (e) => {
        applyRippleEffect(e, calculateBtn);
        // Add artificial delays matching native mobile calculation runtime ticks
        setTimeout(() => {
            executeCalculations();
        }, 100);
    });

    resetBtn.addEventListener('click', () => {
        localStorage.clear();
        goldPriceInput.value = 10250;
        goldQtyInput.value = 50;
        interestRateSlider.value = 9;
        interestRateValLabel.textContent = "9%";
        loanDurationSelect.value = 12;
        futurePriceInput.value = 11787;
        growthPctInput.value = 15;
        
        if(selectedExpectationMode !== 'targetPrice') {
            toggleTabs[0].click();
        }
        
        autoSuggestLoanAmount();
        resultsSection.classList.add('hidden');
        if(currentChartInstance) currentChartInstance.destroy();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Share and Export Canvas Processing Matrices ---
    shareBtn.addEventListener('click', () => {
        const textPayload = `Gold Investment Strategy Assessment:\n\n` + 
                            `Current Price: ${formatCurrency(parseFloat(goldPriceInput.value))}/g\n` +
                            `Expected Target Price: ${formatCurrency(parseFloat(futurePriceInput.value))}/g\n` +
                            `Break-Even Required Appreciation: ${bePct.textContent}\n\n` +
                            `Verdict Assessment: ${comparisonVerdictCard.textContent}\n\n` +
                            `Generated via AuraGold Investment Engine.`;

        if (navigator.share) {
            navigator.share({
                title: 'Gold Loan Strategy Analysis',
                text: textPayload
            }).catch(console.error);
        } else {
            // Clipboard Fallback Strategy Execution
            navigator.clipboard.writeText(textPayload).then(() => {
                toast.classList.remove('hidden');
                setTimeout(() => toast.classList.add('hidden'), 3000);
            });
        }
    });

    downloadBtn.addEventListener('click', () => {
        // Render processing visual states using HTML2Canvas library engine 
        downloadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating Image...`;
        
        // Target calculation application container block space layout context elements
        const targetElement = document.getElementById('calcApp');
        
        html2canvas(targetElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            scale: 2 // Escalated pixel layout enhancement matching high-dpi presentation requirements
        }).then(canvas => {
            const imageUri = canvas.toDataURL('image/png');
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = imageUri;
            downloadAnchor.download = `AuraGold_Investment_Assessment_${Date.now()}.png`;
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            document.body.removeChild(downloadAnchor);
            
            downloadBtn.innerHTML = `<i class="fa-solid fa-file-image"></i> Save PNG Analysis`;
        }).catch(err => {
            console.error(err);
            downloadBtn.innerHTML = `<i class="fa-solid fa-file-image"></i> Save PNG Analysis`;
            alert("Export sequence compilation failure mapping system nodes layout parameters.");
        });
    });

    // Run Engine Init
    initLocalStorageCache();
    autoSuggestLoanAmount();
});
$(document).ready(function () {

    "use strict";


    /* =====================================================
       DOM
       ===================================================== */

    const canvas =
        document.getElementById(
            "juliaCanvas"
        );


    if (!canvas) {

        console.error(
            "Julia canvas was not found."
        );

        return;
    }


    const $renderState =
        $("#renderState");

    const $renderOverlay =
        $("#renderOverlay");

    const $progressBar =
        $("#renderProgressBar");


    const $magnificationDisplay =
        $("#magnificationDisplay");

    const $iterationDisplay =
        $("#iterationDisplay");

    const $renderPassDisplay =
        $("#renderPassDisplay");

    const $renderTimeDisplay =
        $("#renderTimeDisplay");


    const $cReal =
        $("#cReal");

    const $cImag =
        $("#cImag");

    const $constantDisplay =
        $("#constantDisplay");


    const $centerX =
        $("#centerX");

    const $centerY =
        $("#centerY");

    const $magnification =
        $("#magnification");


    const $maxIterations =
        $("#maxIterations");

    const $bailout =
        $("#bailout");

    const $smoothColouring =
        $("#smoothColouring");


    const $renderButton =
        $("#renderButton");

    const $stopButton =
        $("#stopButton");

    const $resetButton =
        $("#resetButton");

    const $downloadButton =
        $("#downloadButton");


    const $gradientPreview =
        $("#gradientPreview");

    const $gradientStops =
        $("#gradientStops");

    const $gradientColour =
        $("#gradientColour");

    const $addColourButton =
        $("#addColourButton");

    const $removeColourButton =
        $("#removeColourButton");

    const $reverseGradientButton =
        $("#reverseGradientButton");

    const $resetGradientButton =
        $("#resetGradientButton");


    /* =====================================================
       Core objects
       ===================================================== */

    const canvasRenderer =
        new CanvasRenderer(
            canvas
        );


    const coordinateMapper =
        new CoordinateMapper(
            canvas.width,
            canvas.height
        );


    let gradient =
        SmoothGradient.createDefault();


    const progressiveRenderer =
        new ProgressiveRenderer(
            canvasRenderer,
            coordinateMapper,
            gradient
        );


    /* =====================================================
       Application state
       ===================================================== */

    const DEFAULTS = {

        cReal:
            -0.8,

        cImag:
            0.156,

        centerX:
            0.0,

        centerY:
            0.0,

        magnification:
            1.0,

        maxIterations:
            500,

        bailout:
            4.0,

        smoothColouring:
            true
    };


    let selectedGradientIndex =
        0;


    let renderStartTime =
        0;


    let renderTimer =
        null;


    /*
     * Mouse selection state.
     */
    let selecting =
        false;


    let selectionStartX =
        0;


    let selectionStartY =
        0;


    let selectionEndX =
        0;


    let selectionEndY =
        0;


    /*
     * Selection overlay is drawn as a DOM element
     * over the canvas rather than modifying the
     * fractal ImageData.
     */
    const selectionBox =
        document.createElement(
            "div"
        );


    selectionBox.id =
        "juliaSelectionBox";


    selectionBox.style.position =
        "absolute";

    selectionBox.style.display =
        "none";

    selectionBox.style.pointerEvents =
        "none";

    selectionBox.style.border =
        "1px solid rgba(255,255,255,0.95)";

    selectionBox.style.background =
        "rgba(255,255,255,0.10)";

    selectionBox.style.boxSizing =
        "border-box";

    selectionBox.style.zIndex =
        "20";

    selectionBox.style.mixBlendMode =
        "difference";


    /*
     * Canvas needs a positioned parent for the
     * selection rectangle.
     */
    const canvasParent =
        canvas.parentElement;


    if (canvasParent) {

        const currentPosition =
            window
                .getComputedStyle(
                    canvasParent
                )
                .position;


        if (
            currentPosition ===
            "static"
        ) {

            canvasParent.style.position =
                "relative";
        }


        canvasParent.appendChild(
            selectionBox
        );
    }


    /* =====================================================
       Number parsing
       ===================================================== */

    function readFiniteNumber(
        $element,
        fallback
    ) {

        const value =
            Number(
                $element.val()
            );


        if (
            !Number.isFinite(value)
        ) {

            return fallback;
        }


        return value;
    }


    function readPositiveNumber(
        $element,
        fallback
    ) {

        const value =
            readFiniteNumber(
                $element,
                fallback
            );


        if (
            value <= 0
        ) {

            return fallback;
        }


        return value;
    }


    function readPositiveInteger(
        $element,
        fallback
    ) {

        const value =
            Math.floor(
                readFiniteNumber(
                    $element,
                    fallback
                )
            );


        if (
            !Number.isFinite(value) ||
            value < 1
        ) {

            return fallback;
        }


        return value;
    }


    /* =====================================================
       Formatting
       ===================================================== */

    function formatNumber(
        value,
        digits = 12
    ) {

        if (
            !Number.isFinite(value)
        ) {

            return "0";
        }


        if (
            value === 0
        ) {

            return "0";
        }


        const absolute =
            Math.abs(
                value
            );


        /*
         * Scientific notation becomes much easier
         * to read once deep zooming begins.
         */
        if (
            absolute < 1e-6 ||
            absolute >= 1e9
        ) {

            return value.toExponential(
                8
            );
        }


        return Number(
            value.toPrecision(
                digits
            )
        ).toString();
    }


    function formatConstant(
        real,
        imaginary
    ) {

        const sign =
            imaginary < 0
                ? "-"
                : "+";


        return (
            formatNumber(
                real
            ) +
            " " +
            sign +
            " " +
            formatNumber(
                Math.abs(
                    imaginary
                )
            ) +
            "i"
        );
    }


    function formatMagnification(
        magnification
    ) {

        if (
            magnification >= 1000000
        ) {

            return (
                magnification.toExponential(
                    3
                ) +
                "×"
            );
        }


        if (
            magnification >= 1000
        ) {

            return (
                magnification.toLocaleString(
                    undefined,
                    {
                        maximumFractionDigits:
                            2
                    }
                ) +
                "×"
            );
        }


        return (
            formatNumber(
                magnification,
                8
            ) +
            "×"
        );
    }


    function formatRenderTime(
        milliseconds
    ) {

        if (
            milliseconds < 1000
        ) {

            return (
                Math.round(
                    milliseconds
                ) +
                " ms"
            );
        }


        return (
            (
                milliseconds /
                1000
            ).toFixed(
                2
            ) +
            " s"
        );
    }


    /* =====================================================
       Status
       ===================================================== */

    function setRenderState(
        text
    ) {

        $renderState.text(
            text
        );
    }


    function setProgress(
        percentage
    ) {

        percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            );


        $progressBar.css(
            "width",
            percentage + "%"
        );


        $progressBar.attr(
            "aria-valuenow",
            percentage
        );
    }


    function setRenderingUI(
        rendering
    ) {

        if (rendering) {

            $renderOverlay.addClass(
                "active"
            );


            $renderButton.prop(
                "disabled",
                true
            );


            $stopButton.prop(
                "disabled",
                false
            );

        } else {

            $renderOverlay.removeClass(
                "active"
            );


            $renderButton.prop(
                "disabled",
                false
            );


            $stopButton.prop(
                "disabled",
                true
            );
        }
    }


    /* =====================================================
       Render timer
       ===================================================== */

    function startRenderTimer() {

        stopRenderTimer();


        renderStartTime =
            performance.now();


        $renderTimeDisplay.text(
            "0 ms"
        );


        renderTimer =
            window.setInterval(
                function () {

                    if (
                        !progressiveRenderer
                            .isRunning()
                    ) {

                        return;
                    }


                    const elapsed =
                        performance.now() -
                        renderStartTime;


                    $renderTimeDisplay.text(
                        formatRenderTime(
                            elapsed
                        )
                    );

                },
                100
            );
    }


    function stopRenderTimer() {

        if (
            renderTimer !==
            null
        ) {

            window.clearInterval(
                renderTimer
            );


            renderTimer =
                null;
        }
    }


    /* =====================================================
       Constant display
       ===================================================== */

    function updateConstantDisplay() {
        $("#constantSummary").text(formatConstant(readFiniteNumber($cReal, DEFAULTS.cReal), readFiniteNumber($cImag, DEFAULTS.cImag)));

        const real =
            readFiniteNumber(
                $cReal,
                DEFAULTS.cReal
            );


        const imaginary =
            readFiniteNumber(
                $cImag,
                DEFAULTS.cImag
            );


        $constantDisplay.text(
            formatConstant(
                real,
                imaginary
            )
        );
    }


    /* =====================================================
       View display
       ===================================================== */

    function updateViewInputs() {

        const view =
            coordinateMapper
                .getView();


        $centerX.val(
            formatNumber(
                view.centerX,
                15
            )
        );


        $centerY.val(
            formatNumber(
                view.centerY,
                15
            )
        );


        $magnification.val(
            formatNumber(
                view.magnification,
                12
            )
        );


        $magnificationDisplay.text(
            formatMagnification(
                view.magnification
            )
        );
    }


    /* =====================================================
       Apply UI settings
       ===================================================== */

    function applyInputsToRenderer() {

        const cReal =
            readFiniteNumber(
                $cReal,
                DEFAULTS.cReal
            );


        const cImag =
            readFiniteNumber(
                $cImag,
                DEFAULTS.cImag
            );


        const centerX =
            readFiniteNumber(
                $centerX,
                0.0
            );


        const centerY =
            readFiniteNumber(
                $centerY,
                0.0
            );


        const magnification =
            readPositiveNumber(
                $magnification,
                1.0
            );


        const maxIterations =
            readPositiveInteger(
                $maxIterations,
                DEFAULTS.maxIterations
            );


        const bailout =
            readPositiveNumber(
                $bailout,
                DEFAULTS.bailout
            );


        const smooth =
            $smoothColouring
                .is(":checked");


        /*
         * Put sanitised values back into the UI.
         */
        $cReal.val(
            formatNumber(
                cReal,
                15
            )
        );


        $cImag.val(
            formatNumber(
                cImag,
                15
            )
        );


        $maxIterations.val(
            maxIterations
        );


        $bailout.val(
            bailout
        );


        /*
         * Configure coordinate mapper.
         */
        coordinateMapper.setCenter(
            centerX,
            centerY
        );


        coordinateMapper.setMagnification(
            magnification
        );


        /*
         * Configure renderer.
         */
        progressiveRenderer
            .setJuliaConstant(
                cReal,
                cImag
            );


        progressiveRenderer
            .setMaxIterations(
                maxIterations
            );


        progressiveRenderer
            .setBailout(
                bailout
            );


        progressiveRenderer
            .setSmoothColouring(
                smooth
            );


        progressiveRenderer
            .setGradient(
                gradient
            );


        $iterationDisplay.text(
            maxIterations
        );


        updateConstantDisplay();

        updateViewInputs();
    }


    /* =====================================================
       Render
       ===================================================== */

    async function renderJulia() {

        /*
         * Invalidate an old render before changing
         * any renderer settings.
         */
        if (
            progressiveRenderer
                .isRunning()
        ) {

            progressiveRenderer.stop();
        }


        try {

            applyInputsToRenderer();

        } catch (error) {

            console.error(
                error
            );


            setRenderState(
                "Invalid settings"
            );


            return;
        }


        hideSelection();


        setProgress(
            0
        );


        $renderPassDisplay.text(
            "Starting"
        );


        setRenderState(
            "Rendering"
        );


        setRenderingUI(
            true
        );


        startRenderTimer();


        try {

            await progressiveRenderer
                .render();

        } catch (error) {

            console.error(
                error
            );


            stopRenderTimer();


            setRenderingUI(
                false
            );


            setRenderState(
                "Render error"
            );
        }
    }


    /* =====================================================
       Renderer listeners
       ===================================================== */

    progressiveRenderer
        .setPassStartListener(
            function (event) {

                $renderPassDisplay.text(
                    event.pass +
                    "×" +
                    event.pass
                );


                setRenderState(
                    "Rendering " +
                    event.pass +
                    "×" +
                    event.pass
                );
            }
        );


    progressiveRenderer
        .setPassCompleteListener(
            function (event) {

                $renderPassDisplay.text(
                    event.pass +
                    "×" +
                    event.pass
                );
            }
        );


    progressiveRenderer
        .setProgressListener(
            function (event) {

                setProgress(
                    event.percentage
                );
            }
        );


    progressiveRenderer
        .setCompleteListener(
            function (event) {

                stopRenderTimer();


                setRenderingUI(
                    false
                );


                setProgress(
                    100
                );


                $renderPassDisplay.text(
                    "1×1"
                );


                $renderTimeDisplay.text(
                    formatRenderTime(
                        event.elapsedMilliseconds
                    )
                );


                setRenderState(
                    "Complete"
                );


                updateViewInputs();
            }
        );


    progressiveRenderer
        .setStopListener(
            function () {

                stopRenderTimer();


                setRenderingUI(
                    false
                );


                setRenderState(
                    "Stopped"
                );
            }
        );


    /* =====================================================
       Gradient editor
       ===================================================== */

    function rebuildGradientEditor() {

        const entries =
            gradient.getEntries();


        $gradientStops.empty();


        if (
            entries.length ===
            0
        ) {

            selectedGradientIndex =
                -1;


            $gradientPreview.css(
                "background",
                "#000000"
            );


            return;
        }


        if (
            selectedGradientIndex <
            0
        ) {

            selectedGradientIndex =
                0;
        }


        if (
            selectedGradientIndex >=
            entries.length
        ) {

            selectedGradientIndex =
                entries.length -
                1;
        }


        /*
         * Gradient preview.
         */
        $gradientPreview.css(
            "background",
            gradient.toCSSGradient()
        );


        /*
         * Create clickable stop controls.
         */
        entries.forEach(
            function (
                entry,
                index
            ) {

                const $stop =
                    $("<button>", {

                        type:
                            "button",

                        class:
                            "gradient-stop",

                        title:
                            (
                                entry
                                    .getPosition() *
                                100
                            ).toFixed(
                                1
                            ) +
                            "%"
                    });


                $stop.attr(
                    "data-index",
                    index
                );


                $stop.css(
                    "background",
                    entry.toHex()
                );


                /*
                 * Position stops along the gradient
                 * if the CSS provides absolute
                 * positioning. It remains harmless
                 * if the stylesheet uses flex.
                 */
                $stop.css(
                    "left",
                    (
                        entry.getPosition() *
                        100
                    ) +
                    "%"
                );


                if (
                    index ===
                    selectedGradientIndex
                ) {

                    $stop.addClass(
                        "selected"
                    );
                }


                $gradientStops.append(
                    $stop
                );
            }
        );


        const selected =
            entries[
                selectedGradientIndex
            ];


        if (selected) {

            $gradientColour.val(
                selected.toHex()
            );
        }
    }


    function recolourAfterGradientChange() {

        /*
         * Updating colours does not require another
         * Julia calculation.
         */
        if (
            progressiveRenderer
                .isRunning()
        ) {

            return;
        }


        progressiveRenderer
            .setGradient(
                gradient
            );


        progressiveRenderer
            .recolour();
    }


    function selectGradientStop(
        index
    ) {

        const entries =
            gradient.getEntries();


        if (
            index < 0 ||
            index >= entries.length
        ) {

            return;
        }


        selectedGradientIndex =
            index;


        rebuildGradientEditor();
    }


    $gradientStops.on(
        "click",
        ".gradient-stop",
        function () {

            const index =
                Number(
                    $(this).attr(
                        "data-index"
                    )
                );


            selectGradientStop(
                index
            );
        }
    );


    $gradientColour.on(
        "input change",
        function () {

            if (
                selectedGradientIndex <
                0
            ) {

                return;
            }


            const entry =
                gradient.getEntry(
                    selectedGradientIndex
                );


            if (!entry) {

                return;
            }


            try {

                entry.setHex(
                    $gradientColour.val()
                );


                /*
                 * getEntry() returns the internal
                 * entry, so rebuild the lookup after
                 * changing it.
                 */
                gradient.buildLookup();


                rebuildGradientEditor();


                recolourAfterGradientChange();

            } catch (error) {

                console.error(
                    error
                );
            }
        }
    );


    $addColourButton.on(
        "click",
        function () {

            const entries =
                gradient.getEntries();


            let position =
                0.5;


            /*
             * Add the new stop halfway between the
             * selected stop and its neighbour.
             */
            if (
                entries.length > 0 &&
                selectedGradientIndex >= 0
            ) {

                const selected =
                    entries[
                        selectedGradientIndex
                    ];


                if (
                    selectedGradientIndex <
                    entries.length -
                    1
                ) {

                    const next =
                        entries[
                            selectedGradientIndex +
                            1
                        ];


                    position =
                        (
                            selected
                                .getPosition() +
                            next
                                .getPosition()
                        ) /
                        2.0;

                } else if (
                    selectedGradientIndex >
                    0
                ) {

                    const previous =
                        entries[
                            selectedGradientIndex -
                            1
                        ];


                    position =
                        (
                            previous
                                .getPosition() +
                            selected
                                .getPosition()
                        ) /
                        2.0;
                }
            }


            gradient.addHex(
                position,
                $gradientColour.val() ||
                    "#FFFFFF"
            );


            /*
             * Find the newly inserted stop after
             * SmoothGradient sorts its entries.
             */
            const newEntries =
                gradient.getEntries();


            let nearestIndex =
                0;


            let nearestDistance =
                Infinity;


            newEntries.forEach(
                function (
                    entry,
                    index
                ) {

                    const distance =
                        Math.abs(
                            entry.getPosition() -
                            position
                        );


                    if (
                        distance <
                        nearestDistance
                    ) {

                        nearestDistance =
                            distance;

                        nearestIndex =
                            index;
                    }
                }
            );


            selectedGradientIndex =
                nearestIndex;


            rebuildGradientEditor();

            recolourAfterGradientChange();
        }
    );


    $removeColourButton.on(
        "click",
        function () {

            const count =
                gradient.getEntryCount();


            /*
             * Keep at least two control points.
             */
            if (
                count <= 2 ||
                selectedGradientIndex <
                    0
            ) {

                return;
            }


            gradient.removeEntry(
                selectedGradientIndex
            );


            selectedGradientIndex =
                Math.min(
                    selectedGradientIndex,
                    gradient.getEntryCount() -
                        1
                );


            rebuildGradientEditor();

            recolourAfterGradientChange();
        }
    );


    $reverseGradientButton.on(
        "click",
        function () {

            gradient.reverse();


            selectedGradientIndex =
                Math.max(
                    0,
                    gradient.getEntryCount() -
                        1 -
                        selectedGradientIndex
                );


            rebuildGradientEditor();

            recolourAfterGradientChange();
        }
    );


    $resetGradientButton.on(
        "click",
        function () {

            gradient =
                SmoothGradient.createDefault();


            selectedGradientIndex =
                0;


            progressiveRenderer
                .setGradient(
                    gradient
                );


            rebuildGradientEditor();

            recolourAfterGradientChange();
        }
    );


    /* =====================================================
       Buttons
       ===================================================== */

    $('#zoomOutButton').on('click', function () {
        progressiveRenderer.stop();
        coordinateMapper.zoomAtPixel(canvas.width / 2, canvas.height / 2, 0.5);
        updateViewInputs();
        renderJulia();
    });
    $('#canvasResetButton').on('click', function () { $resetButton.trigger('click'); });

    $renderButton.on(
        "click",
        function () {

            renderJulia();
        }
    );


    $stopButton.on(
        "click",
        function () {

            progressiveRenderer
                .stop();
        }
    );


    $resetButton.on(
        "click",
        function () {

            if (
                progressiveRenderer
                    .isRunning()
            ) {

                progressiveRenderer
                    .stop();
            }


            $cReal.val(
                DEFAULTS.cReal
            );


            $cImag.val(
                DEFAULTS.cImag
            );


            $centerX.val(
                DEFAULTS.centerX
            );


            $centerY.val(
                DEFAULTS.centerY
            );


            $magnification.val(
                DEFAULTS.magnification
            );


            $maxIterations.val(
                DEFAULTS.maxIterations
            );


            $bailout.val(
                DEFAULTS.bailout
            );


            $smoothColouring.prop(
                "checked",
                DEFAULTS.smoothColouring
            );


            coordinateMapper.reset();


            hideSelection();


            updateConstantDisplay();

            updateViewInputs();


            renderJulia();
        }
    );


    $downloadButton.on(
        "click",
        function () {

            canvasRenderer
                .downloadPNG(
                    "julia-set.png"
                );
        }
    );


    /* =====================================================
       Julia presets
       ===================================================== */

    $(".preset-card").on(
        "click",
        function () {

            const real =
                Number(
                    $(this).attr(
                        "data-real"
                    )
                );


            const imaginary =
                Number(
                    $(this).attr(
                        "data-imag"
                    )
                );


            if (
                !Number.isFinite(real) ||
                !Number.isFinite(imaginary)
            ) {

                return;
            }


            $cReal.val(
                real
            );


            $cImag.val(
                imaginary
            );


            /*
             * Presets start from the complete
             * Julia plane rather than retaining an
             * old deep zoom.
             */
            coordinateMapper.reset();


            updateViewInputs();

            updateConstantDisplay();


            renderJulia();
        }
    );


    /* =====================================================
       Live constant display
       ===================================================== */

    $cReal.add(
        $cImag
    ).on(
        "input",
        function () {

            updateConstantDisplay();
        }
    );


    /* =====================================================
       Canvas mouse coordinates
       ===================================================== */

    function getCanvasMousePosition(
        event
    ) {

        const rectangle =
            canvas.getBoundingClientRect();


        /*
         * Canvas may be displayed at a different CSS
         * size from its internal 900x600 resolution.
         */
        const scaleX =
            canvas.width /
            rectangle.width;


        const scaleY =
            canvas.height /
            rectangle.height;


        let x =
            (
                event.clientX -
                rectangle.left
            ) *
            scaleX;


        let y =
            (
                event.clientY -
                rectangle.top
            ) *
            scaleY;


        x =
            Math.max(
                0,
                Math.min(
                    canvas.width - 1,
                    x
                )
            );


        y =
            Math.max(
                0,
                Math.min(
                    canvas.height - 1,
                    y
                )
            );


        return {
            x: x,
            y: y
        };
    }


    /* =====================================================
       Selection overlay
       ===================================================== */

    function hideSelection() {

        selecting =
            false;


        selectionBox.style.display =
            "none";
    }


    function drawSelection() {

        const canvasRectangle =
            canvas.getBoundingClientRect();


        const parentRectangle =
            canvasParent
                .getBoundingClientRect();


        const scaleX =
            canvasRectangle.width /
            canvas.width;


        const scaleY =
            canvasRectangle.height /
            canvas.height;


        const left =
            Math.min(
                selectionStartX,
                selectionEndX
            );


        const right =
            Math.max(
                selectionStartX,
                selectionEndX
            );


        const top =
            Math.min(
                selectionStartY,
                selectionEndY
            );


        const bottom =
            Math.max(
                selectionStartY,
                selectionEndY
            );


        selectionBox.style.left =
            (
                canvasRectangle.left -
                parentRectangle.left +
                left *
                scaleX
            ) +
            "px";


        selectionBox.style.top =
            (
                canvasRectangle.top -
                parentRectangle.top +
                top *
                scaleY
            ) +
            "px";


        selectionBox.style.width =
            (
                right -
                left
            ) *
            scaleX +
            "px";


        selectionBox.style.height =
            (
                bottom -
                top
            ) *
            scaleY +
            "px";


        selectionBox.style.display =
            "block";
    }


    /* =====================================================
       Drag-to-zoom
       ===================================================== */

    $(canvas).on(
        "mousedown",
        function (event) {

            /*
             * Left mouse button only.
             */
            if (
                event.button !==
                0
            ) {

                return;
            }


            /*
             * Do not alter the viewport in the
             * middle of a calculation.
             */
            if (
                progressiveRenderer
                    .isRunning()
            ) {

                return;
            }


            event.preventDefault();


            const point =
                getCanvasMousePosition(
                    event
                );


            selecting =
                true;


            selectionStartX =
                point.x;


            selectionStartY =
                point.y;


            selectionEndX =
                point.x;


            selectionEndY =
                point.y;


            drawSelection();
        }
    );


    $(document).on(
        "mousemove.juliaZoom",
        function (event) {

            if (!selecting) {

                return;
            }


            const point =
                getCanvasMousePosition(
                    event
                );


            /*
             * Lock selection to the canvas aspect
             * ratio.
             */
            const constrained =
                coordinateMapper
                    .constrainSelection(
                        selectionStartX,
                        selectionStartY,
                        point.x,
                        point.y
                    );


            selectionEndX =
                constrained.endX;


            selectionEndY =
                constrained.endY;


            /*
             * Keep the displayed rectangle within
             * the canvas.
             *
             * constrainSelection() can extend beyond
             * an edge while maintaining aspect ratio.
             */
            selectionEndX =
                Math.max(
                    0,
                    Math.min(
                        canvas.width - 1,
                        selectionEndX
                    )
                );


            selectionEndY =
                Math.max(
                    0,
                    Math.min(
                        canvas.height - 1,
                        selectionEndY
                    )
                );


            drawSelection();
        }
    );


    $(document).on(
        "mouseup.juliaZoom",
        function (event) {

            if (!selecting) {

                return;
            }


            if (
                event.button !==
                0
            ) {

                return;
            }


            selecting =
                false;


            selectionBox.style.display =
                "none";


            const width =
                Math.abs(
                    selectionEndX -
                    selectionStartX
                );


            const height =
                Math.abs(
                    selectionEndY -
                    selectionStartY
                );


            /*
             * Treat tiny selections as clicks rather
             * than accidental extreme zooms.
             */
            if (
                width < 5 ||
                height < 5
            ) {

                return;
            }


            const changed =
                coordinateMapper
                    .zoomToPixelBounds(
                        selectionStartX,
                        selectionStartY,
                        selectionEndX,
                        selectionEndY
                    );


            if (!changed) {

                return;
            }


            updateViewInputs();


            renderJulia();
        }
    );


    /* =====================================================
       Double-click zoom

       Convenient alternative to drawing a box.
       ===================================================== */

    $(canvas).on(
        "dblclick",
        function (event) {

            if (
                progressiveRenderer
                    .isRunning()
            ) {

                return;
            }


            event.preventDefault();


            const point =
                getCanvasMousePosition(
                    event
                );


            coordinateMapper
                .zoomAtPixel(
                    point.x,
                    point.y,
                    2.0
                );


            updateViewInputs();


            renderJulia();
        }
    );


    /* =====================================================
       Prevent browser drag behaviour
       ===================================================== */

    $(canvas).on(
        "dragstart",
        function (event) {

            event.preventDefault();
        }
    );


    /* =====================================================
       Keyboard shortcuts
       ===================================================== */

    $(document).on(
        "keydown",
        function (event) {

            /*
             * Do not steal keyboard commands while
             * the user is typing in an input.
             */
            const tag =
                document.activeElement
                    ?.tagName
                    ?.toLowerCase();


            const typing =
                tag === "input" ||
                tag === "textarea" ||
                tag === "select";


            if (typing) {

                return;
            }


            /*
             * R = render
             */
            if (
                event.key.toLowerCase() ===
                "r"
            ) {

                event.preventDefault();

                renderJulia();

                return;
            }


            /*
             * Escape = stop render or cancel
             * selection.
             */
            if (
                event.key ===
                "Escape"
            ) {

                if (selecting) {

                    hideSelection();

                    return;
                }


                if (
                    progressiveRenderer
                        .isRunning()
                ) {

                    progressiveRenderer
                        .stop();
                }
            }
        }
    );


    /* =====================================================
       Enter in calculation fields = render
       ===================================================== */

    $cReal
        .add($cImag)
        .add($centerX)
        .add($centerY)
        .add($magnification)
        .add($maxIterations)
        .add($bailout)
        .on(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    renderJulia();
                }
            }
        );


    /* =====================================================
       Initial state
       ===================================================== */

    function initialise() {

        $cReal.val(
            DEFAULTS.cReal
        );


        $cImag.val(
            DEFAULTS.cImag
        );


        $centerX.val(
            DEFAULTS.centerX
        );


        $centerY.val(
            DEFAULTS.centerY
        );


        $magnification.val(
            DEFAULTS.magnification
        );


        $maxIterations.val(
            DEFAULTS.maxIterations
        );


        $bailout.val(
            DEFAULTS.bailout
        );


        $smoothColouring.prop(
            "checked",
            DEFAULTS.smoothColouring
        );


        coordinateMapper.reset();


        progressiveRenderer
            .setGradient(
                gradient
            );


        updateConstantDisplay();

        updateViewInputs();

        rebuildGradientEditor();


        $iterationDisplay.text(
            DEFAULTS.maxIterations
        );


        $renderPassDisplay.text(
            "—"
        );


        $renderTimeDisplay.text(
            "—"
        );


        setProgress(
            0
        );


        setRenderingUI(
            false
        );


        setRenderState(
            "Ready"
        );


        /*
         * Render the default Julia set immediately.
         */
        renderJulia();
    }


    initialise();

});
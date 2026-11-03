class ProgressiveRenderer {

    constructor(
        canvasRenderer,
        coordinateMapper,
        gradient
    ) {

        if (!canvasRenderer) {
            throw new Error(
                "CanvasRenderer is required."
            );
        }

        if (!coordinateMapper) {
            throw new Error(
                "CoordinateMapper is required."
            );
        }

        if (!gradient) {
            throw new Error(
                "Gradient is required."
            );
        }


        this.canvasRenderer =
            canvasRenderer;

        this.coordinateMapper =
            coordinateMapper;

        this.gradient =
            gradient;


        /*
         * Progressive rendering passes.
         */
        this.passes = [
            8,
            4,
            2,
            1
        ];


        /*
         * Julia constant.
         */
        this.cReal =
            -0.8;

        this.cImag =
            0.156;


        /*
         * Calculation settings.
         */
        this.maxIterations =
            500;

        this.bailout =
            4.0;

        this.smoothColouring =
            true;


        /*
         * Colour scale.
         *
         * You increased this substantially to
         * produce broader, smoother colour bands.
         */
        this.gradientMultiplier =
            200.0;


        /*
         * Final supersampling.
         *
         * After the exact 1x1 render, each pixel
         * receives eight additional samples around
         * the existing centre sample.
         */
        this.antiAliasing =
            true;

        this.subPixelOffset =
            1.0 / 3.0;


        /*
         * Browser work budget.
         */
        this.frameBudget =
            10;


        /*
         * Generation/cancellation state.
         */
        this.generation =
            0;

        this.running =
            false;


        /*
         * Progress state.
         */
        this.currentPass =
            0;

        this.currentPassIndex =
            -1;

        this.completedSamples =
            0;

        this.totalSamples =
            0;


        /*
         * Event listeners.
         */
        this.passStartListener =
            null;

        this.passCompleteListener =
            null;

        this.progressListener =
            null;

        this.completeListener =
            null;

        this.stopListener =
            null;
    }


    /* =====================================================
       Julia constant
       ===================================================== */

    setJuliaConstant(
        real,
        imaginary
    ) {

        this.validateFiniteNumber(
            real,
            "Julia real component"
        );

        this.validateFiniteNumber(
            imaginary,
            "Julia imaginary component"
        );


        this.cReal =
            real;

        this.cImag =
            imaginary;


        return this;
    }


    setCReal(real) {

        this.validateFiniteNumber(
            real,
            "Julia real component"
        );


        this.cReal =
            real;


        return this;
    }


    setCImag(imaginary) {

        this.validateFiniteNumber(
            imaginary,
            "Julia imaginary component"
        );


        this.cImag =
            imaginary;


        return this;
    }


    getCReal() {

        return this.cReal;
    }


    getCImag() {

        return this.cImag;
    }


    /* =====================================================
       Iterations
       ===================================================== */

    setMaxIterations(
        maxIterations
    ) {

        if (
            !Number.isInteger(maxIterations) ||
            maxIterations < 1
        ) {

            throw new RangeError(
                "Maximum iterations must be a positive integer."
            );
        }


        this.maxIterations =
            maxIterations;


        return this;
    }


    getMaxIterations() {

        return this.maxIterations;
    }


    /* =====================================================
       Bailout
       ===================================================== */

    setBailout(
        bailout
    ) {

        if (
            typeof bailout !== "number" ||
            !Number.isFinite(bailout) ||
            bailout <= 0
        ) {

            throw new RangeError(
                "Bailout must be a positive finite number."
            );
        }


        this.bailout =
            bailout;


        return this;
    }


    getBailout() {

        return this.bailout;
    }


    /* =====================================================
       Smooth colouring
       ===================================================== */

    setSmoothColouring(
        enabled
    ) {

        this.smoothColouring =
            Boolean(enabled);


        return this;
    }


    isSmoothColouring() {

        return this.smoothColouring;
    }


    /* =====================================================
       Anti-aliasing
       ===================================================== */

    setAntiAliasing(
        enabled
    ) {

        this.antiAliasing =
            Boolean(enabled);


        return this;
    }


    isAntiAliasing() {

        return this.antiAliasing;
    }


    /* =====================================================
       Gradient
       ===================================================== */

    setGradient(
        gradient
    ) {

        if (!gradient) {

            throw new Error(
                "Gradient is required."
            );
        }


        this.gradient =
            gradient;


        return this;
    }


    getGradient() {

        return this.gradient;
    }


    setGradientMultiplier(
        multiplier
    ) {

        if (
            typeof multiplier !== "number" ||
            !Number.isFinite(multiplier) ||
            multiplier <= 0
        ) {

            throw new RangeError(
                "Gradient multiplier must be positive."
            );
        }


        this.gradientMultiplier =
            multiplier;


        return this;
    }


    getGradientMultiplier() {

        return this.gradientMultiplier;
    }


    /* =====================================================
       Frame budget
       ===================================================== */

    setFrameBudget(
        milliseconds
    ) {

        if (
            typeof milliseconds !== "number" ||
            !Number.isFinite(milliseconds) ||
            milliseconds <= 0
        ) {

            throw new RangeError(
                "Frame budget must be positive."
            );
        }


        this.frameBudget =
            milliseconds;


        return this;
    }


    getFrameBudget() {

        return this.frameBudget;
    }


    /* =====================================================
       Progressive passes
       ===================================================== */

    setPasses(
        passes
    ) {

        if (
            !Array.isArray(passes) ||
            passes.length === 0
        ) {

            throw new TypeError(
                "Passes must be a non-empty array."
            );
        }


        const validated =
            [];


        for (const pass of passes) {

            if (
                !Number.isInteger(pass) ||
                pass < 1
            ) {

                throw new RangeError(
                    "Every pass size must be a positive integer."
                );
            }


            validated.push(pass);
        }


        this.passes =
            validated;


        return this;
    }


    getPasses() {

        return [
            ...this.passes
        ];
    }


    /* =====================================================
       Main render
       ===================================================== */

    async render() {

        const generation =
            ++this.generation;


        this.running =
            true;


        this.currentPass =
            0;

        this.currentPassIndex =
            -1;


        this.completedSamples =
            0;


        /*
         * Normal progressive calculations +
         * one AA operation for every final pixel.
         */
        this.totalSamples =
            this.calculateTotalSampleCount();


        if (this.antiAliasing) {

            this.totalSamples +=
                this.canvasRenderer.getWidth() *
                this.canvasRenderer.getHeight();
        }


        this.canvasRenderer
            .beginRender();


        const startTime =
            performance.now();


        this.reportProgress();


        /* =================================================
           NORMAL PROGRESSIVE RENDER
           ================================================= */

        for (
            let passIndex = 0;
            passIndex < this.passes.length;
            passIndex++
        ) {

            if (
                !this.isGenerationActive(
                    generation
                )
            ) {

                return false;
            }


            const blockSize =
                this.passes[
                    passIndex
                ];


            this.currentPass =
                blockSize;

            this.currentPassIndex =
                passIndex;


            if (
                typeof this.passStartListener ===
                "function"
            ) {

                this.passStartListener({

                    pass:
                        blockSize,

                    passIndex:
                        passIndex,

                    passNumber:
                        passIndex + 1,

                    passCount:
                        this.passes.length +
                        (this.antiAliasing ? 1 : 0),

                    antiAliasing:
                        false

                });
            }


            const completed =
                await this.renderPass(
                    blockSize,
                    generation
                );


            if (!completed) {

                return false;
            }


            this.canvasRenderer
                .present();


            if (
                typeof this.passCompleteListener ===
                "function"
            ) {

                this.passCompleteListener({

                    pass:
                        blockSize,

                    passIndex:
                        passIndex,

                    passNumber:
                        passIndex + 1,

                    passCount:
                        this.passes.length +
                        (this.antiAliasing ? 1 : 0),

                    antiAliasing:
                        false

                });
            }
        }


        /* =================================================
           FINAL 3x3 ANTI-ALIASING PASS
           ================================================= */

        if (this.antiAliasing) {

            if (
                !this.isGenerationActive(
                    generation
                )
            ) {

                return false;
            }


            this.currentPass =
                "AA";

            this.currentPassIndex =
                this.passes.length;


            if (
                typeof this.passStartListener ===
                "function"
            ) {

                this.passStartListener({

                    pass:
                        "AA",

                    passIndex:
                        this.passes.length,

                    passNumber:
                        this.passes.length + 1,

                    passCount:
                        this.passes.length + 1,

                    antiAliasing:
                        true

                });
            }


            const completed =
                await this.renderAntiAliasingPass(
                    generation
                );


            if (!completed) {

                return false;
            }


            this.canvasRenderer
                .present();


            if (
                typeof this.passCompleteListener ===
                "function"
            ) {

                this.passCompleteListener({

                    pass:
                        "AA",

                    passIndex:
                        this.passes.length,

                    passNumber:
                        this.passes.length + 1,

                    passCount:
                        this.passes.length + 1,

                    antiAliasing:
                        true

                });
            }
        }


        if (
            !this.isGenerationActive(
                generation
            )
        ) {

            return false;
        }


        this.running =
            false;


        const endTime =
            performance.now();


        this.reportProgress();


        if (
            typeof this.completeListener ===
            "function"
        ) {

            this.completeListener({

                elapsedMilliseconds:
                    endTime - startTime,

                elapsedSeconds:
                    (
                        endTime -
                        startTime
                    ) / 1000.0,

                samples:
                    this.completedSamples,

                cReal:
                    this.cReal,

                cImag:
                    this.cImag,

                antiAliasing:
                    this.antiAliasing

            });
        }


        return true;
    }


    /* =====================================================
       Normal progressive pass
       ===================================================== */

    async renderPass(
        blockSize,
        generation
    ) {

        const width =
            this.canvasRenderer
                .getWidth();


        const height =
            this.canvasRenderer
                .getHeight();


        let frameStart =
            performance.now();


        for (
            let y = 0;
            y < height;
            y += blockSize
        ) {

            for (
                let x = 0;
                x < width;
                x += blockSize
            ) {

                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                /*
                 * Already calculated in an earlier
                 * progressive pass.
                 */
                if (
                    this.canvasRenderer
                        .isComputed(
                            x,
                            y
                        )
                ) {

                    continue;
                }


                const sample =
                    this.calculateSample(
                        x,
                        y
                    );


                this.canvasRenderer
                    .storeResult(
                        x,
                        y,
                        sample.value,
                        sample.inSet
                    );


                const gradientPosition =
                    sample.inSet

                        ? 0.0

                        : this.valueToGradientPosition(
                            sample.value
                        );


                this.canvasRenderer
                    .fillGradientBlock(
                        x,
                        y,
                        blockSize,
                        gradientPosition,
                        sample.inSet,
                        this.gradient
                    );


                this.completedSamples++;


                const now =
                    performance.now();


                if (
                    now -
                    frameStart >=
                    this.frameBudget
                ) {

                    this.canvasRenderer
                        .present();


                    this.reportProgress();


                    await this.nextFrame();


                    if (
                        !this.isGenerationActive(
                            generation
                        )
                    ) {

                        return false;
                    }


                    frameStart =
                        performance.now();
                }
            }
        }


        this.canvasRenderer
            .present();


        this.reportProgress();


        return true;
    }


    /* =====================================================
       FINAL 3x3 SUPERSAMPLING PASS
       ===================================================== */

    async renderAntiAliasingPass(
        generation
    ) {

        const width =
            this.canvasRenderer
                .getWidth();


        const height =
            this.canvasRenderer
                .getHeight();


        const offset =
            this.subPixelOffset;


        /*
         * Eight additional positions.
         *
         * The centre:
         *
         *     (0, 0)
         *
         * is NOT included here because its result
         * was already calculated by the 1x1 pass.
         */
        const offsets = [

            [-offset, -offset],
            [0,       -offset],
            [offset,  -offset],

            [-offset,  0],
            [offset,   0],

            [-offset,  offset],
            [0,        offset],
            [offset,   offset]

        ];


        let frameStart =
            performance.now();


        for (
            let y = 0;
            y < height;
            y++
        ) {

            for (
                let x = 0;
                x < width;
                x++
            ) {

                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                /*
                 * =================================================
                 * SAMPLE 1:
                 * EXISTING CENTRE PIXEL
                 * =================================================
                 */

                const centreValue =
                    this.canvasRenderer
                        .getStoredValue(
                            x,
                            y
                        );


                const centreInSet =
                    this.canvasRenderer
                        .isStoredPointInSet(
                            x,
                            y
                        );


                const centreColour =
                    this.getColourForSample(
                        centreValue,
                        centreInSet
                    );


                let red =
                    centreColour.r;

                let green =
                    centreColour.g;

                let blue =
                    centreColour.b;

                let alpha =
                    centreColour.a;


                /*
                 * =================================================
                 * SAMPLES 2-9:
                 * EIGHT SUBPIXEL POSITIONS
                 * =================================================
                 */

                for (
                    const sampleOffset of offsets
                ) {

                    const sampleX =
                        x +
                        sampleOffset[0];


                    const sampleY =
                        y +
                        sampleOffset[1];


                    const sample =
                        this.calculateSample(
                            sampleX,
                            sampleY
                        );


                    const colour =
                        this.getColourForSample(
                            sample.value,
                            sample.inSet
                        );


                    red +=
                        colour.r;

                    green +=
                        colour.g;

                    blue +=
                        colour.b;

                    alpha +=
                        colour.a;
                }


                /*
                 * =================================================
                 * AVERAGE ALL NINE COLOURS
                 * =================================================
                 */

                red /=
                    9.0;

                green /=
                    9.0;

                blue /=
                    9.0;

                alpha /=
                    9.0;


                /*
                 * Replace the exact 1x1 pixel with
                 * its supersampled colour.
                 */
                this.canvasRenderer
                    .setPixel(
                        x,
                        y,
                        red,
                        green,
                        blue,
                        alpha
                    );


                /*
                 * Progress counts one completed
                 * anti-aliased pixel rather than
                 * eight internal calculations.
                 */
                this.completedSamples++;


                const now =
                    performance.now();


                if (
                    now -
                    frameStart >=
                    this.frameBudget
                ) {

                    /*
                     * This makes the smoothing pass
                     * visibly move across the image.
                     */
                    this.canvasRenderer
                        .present();


                    this.reportProgress();


                    await this.nextFrame();


                    if (
                        !this.isGenerationActive(
                            generation
                        )
                    ) {

                        return false;
                    }


                    frameStart =
                        performance.now();
                }
            }
        }


        this.canvasRenderer
            .present();


        this.reportProgress();


        return true;
    }


    /* =====================================================
       Convert one sample into its actual RGBA colour
       ===================================================== */

    getColourForSample(
        value,
        inSet
    ) {

        /*
         * Julia interior is black.
         */
        if (inSet) {

            return {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            };
        }


        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {

            return {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            };
        }


        const gradientPosition =
            this.valueToGradientPosition(
                value
            );


        const colour =
            this.gradient
                .getLookupColour(
                    gradientPosition
                );


        return this.canvasRenderer
            .normaliseColour(
                colour
            );
    }


    /* =====================================================
       Calculate one Julia sample

       pixelX and pixelY may now be fractional.
       ===================================================== */

    calculateSample(
        pixelX,
        pixelY
    ) {

        const coordinate =
            this.coordinateMapper
                .pixelToNumberCoordinate(
                    pixelX,
                    pixelY
                );


        const output =
            JuliaProcessor.process(
                coordinate.x,
                coordinate.y,
                this.cReal,
                this.cImag,
                this.maxIterations,
                this.bailout
            );


        if (
            output.isInSet()
        ) {

            return {

                value:
                    this.maxIterations,

                inSet:
                    true,

                output:
                    output

            };
        }


        let value;


        if (
            this.smoothColouring
        ) {

            value =
                output.getSmoothIteration();

        } else {

            value =
                output.getIterations();
        }


        if (
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < 0
        ) {

            value =
                output.getIterations();
        }


        return {

            value:
                value,

            inSet:
                false,

            output:
                output

        };
    }


    /* =====================================================
       Escape value -> gradient position
       ===================================================== */

    valueToGradientPosition(
        value
    ) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < 0
        ) {

            return 0.0;
        }


        /*
         * Larger multiplier = broader bands.
         */
        let position =
            value /
            this.gradientMultiplier;


        position =
            position -
            Math.floor(
                position
            );


        if (
            position < 0
        ) {

            position +=
                1.0;
        }


        return position;
    }


    /* =====================================================
       Recolour existing image
       ===================================================== */

    recolour() {

        /*
         * This recolours the exact centre samples.
         *
         * A new full render is required to regenerate
         * the eight AA subpixel colours because those
         * subpixel iteration values are deliberately
         * not stored.
         */
        this.canvasRenderer
            .recolour(
                this.gradient,

                value =>
                    this.valueToGradientPosition(
                        value
                    )
            );
    }


    /* =====================================================
       Stop
       ===================================================== */

    stop() {

        if (
            !this.running
        ) {

            return;
        }


        ++this.generation;


        this.running =
            false;


        if (
            typeof this.stopListener ===
            "function"
        ) {

            this.stopListener();
        }
    }


    isRunning() {

        return this.running;
    }


    /* =====================================================
       Generation state
       ===================================================== */

    isGenerationActive(
        generation
    ) {

        return (
            this.running &&
            generation ===
                this.generation
        );
    }


    /* =====================================================
       Browser yielding
       ===================================================== */

    nextFrame() {

        return new Promise(
            resolve => {

                requestAnimationFrame(
                    resolve
                );
            }
        );
    }


    /* =====================================================
       Progress
       ===================================================== */

    reportProgress() {

        if (
            typeof this.progressListener !==
                "function"
        ) {

            return;
        }


        let progress =
            0.0;


        if (
            this.totalSamples >
            0
        ) {

            progress =
                this.completedSamples /
                this.totalSamples;
        }


        progress =
            Math.max(
                0.0,
                Math.min(
                    1.0,
                    progress
                )
            );


        this.progressListener({

            completed:
                this.completedSamples,

            total:
                this.totalSamples,

            progress:
                progress,

            percentage:
                progress * 100.0,

            pass:
                this.currentPass,

            passIndex:
                this.currentPassIndex,

            passNumber:
                this.currentPassIndex + 1,

            passCount:
                this.passes.length +
                (this.antiAliasing ? 1 : 0),

            antiAliasing:
                this.currentPass === "AA"

        });
    }


    /* =====================================================
       Number of unique progressive samples
       ===================================================== */

    calculateTotalSampleCount() {

        const width =
            this.canvasRenderer
                .getWidth();


        const height =
            this.canvasRenderer
                .getHeight();


        const used =
            new Uint8Array(
                width *
                height
            );


        let count =
            0;


        for (
            const blockSize of
                this.passes
        ) {

            for (
                let y = 0;
                y < height;
                y += blockSize
            ) {

                for (
                    let x = 0;
                    x < width;
                    x += blockSize
                ) {

                    const index =
                        y * width +
                        x;


                    if (
                        used[index] !==
                        0
                    ) {

                        continue;
                    }


                    used[index] =
                        1;


                    count++;
                }
            }
        }


        return count;
    }


    /* =====================================================
       Event listeners
       ===================================================== */

    setPassStartListener(
        listener
    ) {

        this.passStartListener =
            this.validateListener(
                listener
            );


        return this;
    }


    setPassCompleteListener(
        listener
    ) {

        this.passCompleteListener =
            this.validateListener(
                listener
            );


        return this;
    }


    setProgressListener(
        listener
    ) {

        this.progressListener =
            this.validateListener(
                listener
            );


        return this;
    }


    setCompleteListener(
        listener
    ) {

        this.completeListener =
            this.validateListener(
                listener
            );


        return this;
    }


    setStopListener(
        listener
    ) {

        this.stopListener =
            this.validateListener(
                listener
            );


        return this;
    }


    /* =====================================================
       Utilities
       ===================================================== */

    validateListener(
        listener
    ) {

        if (
            listener === null ||
            listener === undefined
        ) {

            return null;
        }


        if (
            typeof listener !==
            "function"
        ) {

            throw new TypeError(
                "Listener must be a function."
            );
        }


        return listener;
    }


    validateFiniteNumber(
        value,
        name
    ) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {

            throw new TypeError(
                `${name} must be a finite number.`
            );
        }
    }
}
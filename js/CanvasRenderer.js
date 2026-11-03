class CanvasRenderer {

    constructor(canvas) {

        if (!(canvas instanceof HTMLCanvasElement)) {

            throw new TypeError(
                "CanvasRenderer requires an HTMLCanvasElement."
            );
        }


        this.canvas =
            canvas;

        this.context =
            canvas.getContext(
                "2d",
                {
                    alpha: false
                }
            );


        if (!this.context) {

            throw new Error(
                "Unable to create 2D canvas context."
            );
        }


        this.width =
            canvas.width;

        this.height =
            canvas.height;


        /*
         * Main image buffer.
         */
        this.imageData =
            this.context.createImageData(
                this.width,
                this.height
            );

        this.pixels =
            this.imageData.data;


        /*
         * Exact calculated values.
         *
         * These arrays contain information only
         * for coordinates that have actually been
         * evaluated by the Julia processor.
         *
         * A coarse 8x8 block may visually cover
         * 64 pixels, but only its sample coordinate
         * is marked as computed.
         */
        this.values =
            new Float64Array(
                this.width *
                this.height
            );


        this.computed =
            new Uint8Array(
                this.width *
                this.height
            );


        this.inside =
            new Uint8Array(
                this.width *
                this.height
            );


        /*
         * Default background.
         */
        this.backgroundRed =
            0;

        this.backgroundGreen =
            0;

        this.backgroundBlue =
            0;

        this.backgroundAlpha =
            255;


        this.clear();
    }


    /* =====================================================
       Dimensions
       ===================================================== */

    getWidth() {

        return this.width;
    }


    getHeight() {

        return this.height;
    }


    getCanvas() {

        return this.canvas;
    }


    getContext() {

        return this.context;
    }


    /* =====================================================
       Begin render
       ===================================================== */

    beginRender() {

        /*
         * A new Julia render represents a completely
         * new coordinate calculation.
         *
         * Forget all results from the previous image.
         */
        this.computed.fill(0);

        this.inside.fill(0);

        this.values.fill(0);


        /*
         * Clear the visible image.
         */
        this.clearPixels();


        this.present();
    }


    /* =====================================================
       Clear
       ===================================================== */

    clear() {

        this.computed.fill(0);

        this.inside.fill(0);

        this.values.fill(0);

        this.clearPixels();

        this.present();
    }


    clearPixels() {

        const pixels =
            this.pixels;


        const red =
            this.backgroundRed;

        const green =
            this.backgroundGreen;

        const blue =
            this.backgroundBlue;

        const alpha =
            this.backgroundAlpha;


        for (
            let i = 0;
            i < pixels.length;
            i += 4
        ) {

            pixels[i] =
                red;

            pixels[i + 1] =
                green;

            pixels[i + 2] =
                blue;

            pixels[i + 3] =
                alpha;
        }
    }


    /* =====================================================
       Background
       ===================================================== */

    setBackgroundColour(
        red,
        green,
        blue,
        alpha = 255
    ) {

        this.backgroundRed =
            this.clampChannel(red);

        this.backgroundGreen =
            this.clampChannel(green);

        this.backgroundBlue =
            this.clampChannel(blue);

        this.backgroundAlpha =
            this.clampChannel(alpha);
    }


    /* =====================================================
       Coordinate utilities
       ===================================================== */

    isInsideCanvas(
        x,
        y
    ) {

        return (
            x >= 0 &&
            y >= 0 &&
            x < this.width &&
            y < this.height
        );
    }


    getIndex(
        x,
        y
    ) {

        return (
            y * this.width +
            x
        );
    }


    getPixelIndex(
        x,
        y
    ) {

        return (
            (
                y * this.width +
                x
            ) * 4
        );
    }


    /* =====================================================
       Computed coordinates
       ===================================================== */

    isComputed(
        x,
        y
    ) {

        if (
            !this.isInsideCanvas(
                x,
                y
            )
        ) {

            return false;
        }


        const index =
            this.getIndex(
                x,
                y
            );


        return (
            this.computed[index] !==
            0
        );
    }


    /* =====================================================
       Store exact Julia result
       ===================================================== */

    storeResult(
        x,
        y,
        value,
        inSet
    ) {

        if (
            !this.isInsideCanvas(
                x,
                y
            )
        ) {

            return;
        }


        const index =
            this.getIndex(
                x,
                y
            );


        this.values[index] =
            Number.isFinite(value)

                ? value
                : 0;


        this.inside[index] =
            inSet

                ? 1
                : 0;


        this.computed[index] =
            1;
    }


    getStoredValue(
        x,
        y
    ) {

        if (
            !this.isInsideCanvas(
                x,
                y
            )
        ) {

            return null;
        }


        const index =
            this.getIndex(
                x,
                y
            );


        if (
            this.computed[index] ===
            0
        ) {

            return null;
        }


        return this.values[index];
    }


    isStoredPointInSet(
        x,
        y
    ) {

        if (
            !this.isInsideCanvas(
                x,
                y
            )
        ) {

            return false;
        }


        const index =
            this.getIndex(
                x,
                y
            );


        return (
            this.computed[index] !== 0 &&
            this.inside[index] !== 0
        );
    }


    /* =====================================================
       Gradient block
       ===================================================== */

    fillGradientBlock(
        startX,
        startY,
        blockSize,
        gradientPosition,
        inSet,
        gradient
    ) {

        /*
         * Julia-set points are rendered black.
         */
        if (inSet) {

            this.fillBlock(
                startX,
                startY,
                blockSize,
                0,
                0,
                0,
                255
            );

            return;
        }


        /*
         * Ask SmoothGradient for the colour.
         *
         * Our SmoothGradient class will expose
         * getLookupColour(position), returning
         * either:
         *
         *     { r, g, b, a }
         *
         * or an ARGB/RGBA compatible colour.
         */
        const colour =
            gradient.getLookupColour(
                gradientPosition
            );


        const rgba =
            this.normaliseColour(
                colour
            );


        this.fillBlock(
            startX,
            startY,
            blockSize,
            rgba.r,
            rgba.g,
            rgba.b,
            rgba.a
        );
    }


    /* =====================================================
       Fill rectangular progressive block
       ===================================================== */

    fillBlock(
        startX,
        startY,
        blockSize,
        red,
        green,
        blue,
        alpha = 255
    ) {

        red =
            this.clampChannel(red);

        green =
            this.clampChannel(green);

        blue =
            this.clampChannel(blue);

        alpha =
            this.clampChannel(alpha);


        /*
         * Prevent blocks on the right/bottom edges
         * extending beyond the ImageData.
         */
        const endX =
            Math.min(
                startX + blockSize,
                this.width
            );


        const endY =
            Math.min(
                startY + blockSize,
                this.height
            );


        for (
            let y = startY;
            y < endY;
            y++
        ) {

            let pixelIndex =
                this.getPixelIndex(
                    startX,
                    y
                );


            for (
                let x = startX;
                x < endX;
                x++
            ) {

                this.pixels[
                    pixelIndex
                ] =
                    red;

                this.pixels[
                    pixelIndex + 1
                ] =
                    green;

                this.pixels[
                    pixelIndex + 2
                ] =
                    blue;

                this.pixels[
                    pixelIndex + 3
                ] =
                    alpha;


                pixelIndex +=
                    4;
            }
        }
    }


    /* =====================================================
       Single pixel
       ===================================================== */

    setPixel(
        x,
        y,
        red,
        green,
        blue,
        alpha = 255
    ) {

        if (
            !this.isInsideCanvas(
                x,
                y
            )
        ) {

            return;
        }


        const pixelIndex =
            this.getPixelIndex(
                x,
                y
            );


        this.pixels[
            pixelIndex
        ] =
            this.clampChannel(
                red
            );

        this.pixels[
            pixelIndex + 1
        ] =
            this.clampChannel(
                green
            );

        this.pixels[
            pixelIndex + 2
        ] =
            this.clampChannel(
                blue
            );

        this.pixels[
            pixelIndex + 3
        ] =
            this.clampChannel(
                alpha
            );
    }


    /* =====================================================
       Recolour existing calculated image
       ===================================================== */

    recolour(
        gradient,
        valueToGradientPosition
    ) {

        if (
            !gradient ||
            typeof gradient.getLookupColour !==
                "function"
        ) {

            throw new TypeError(
                "A valid gradient is required."
            );
        }


        if (
            typeof valueToGradientPosition !==
            "function"
        ) {

            throw new TypeError(
                "A gradient-position function is required."
            );
        }


        const width =
            this.width;

        const height =
            this.height;


        /*
         * Recolour only exact coordinates that
         * have already been calculated.
         *
         * During a finished 1x1 pass this means
         * every pixel.
         *
         * During an interrupted progressive render
         * only genuinely calculated samples are
         * recoloured.
         */
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

                const index =
                    y * width +
                    x;


                if (
                    this.computed[index] ===
                    0
                ) {

                    continue;
                }


                /*
                 * Julia-set interior.
                 */
                if (
                    this.inside[index] !==
                    0
                ) {

                    this.setPixel(
                        x,
                        y,
                        0,
                        0,
                        0,
                        255
                    );

                    continue;
                }


                const value =
                    this.values[index];


                const gradientPosition =
                    valueToGradientPosition(
                        value
                    );


                const colour =
                    gradient.getLookupColour(
                        gradientPosition
                    );


                const rgba =
                    this.normaliseColour(
                        colour
                    );


                this.setPixel(
                    x,
                    y,
                    rgba.r,
                    rgba.g,
                    rgba.b,
                    rgba.a
                );
            }
        }


        this.present();
    }


    /* =====================================================
       Present ImageData
       ===================================================== */

    present() {

        this.context.putImageData(
            this.imageData,
            0,
            0
        );
    }


    /* =====================================================
       Colour conversion
       ===================================================== */

    normaliseColour(colour) {

        /*
         * Object format:
         *
         * { r, g, b, a }
         */
        if (
            colour &&
            typeof colour === "object"
        ) {

            return {

                r:
                    this.clampChannel(
                        colour.r ?? 0
                    ),

                g:
                    this.clampChannel(
                        colour.g ?? 0
                    ),

                b:
                    this.clampChannel(
                        colour.b ?? 0
                    ),

                a:
                    this.clampChannel(
                        colour.a ?? 255
                    )
            };
        }


        /*
         * Packed 32-bit ARGB integer:
         *
         * 0xAARRGGBB
         */
        if (
            typeof colour === "number" &&
            Number.isFinite(colour)
        ) {

            const packed =
                colour >>> 0;


            return {

                a:
                    (
                        packed >>>
                        24
                    ) & 0xff,

                r:
                    (
                        packed >>>
                        16
                    ) & 0xff,

                g:
                    (
                        packed >>>
                        8
                    ) & 0xff,

                b:
                    packed & 0xff
            };
        }


        /*
         * Safe fallback.
         */
        return {

            r: 0,
            g: 0,
            b: 0,
            a: 255
        };
    }


    /* =====================================================
       Channel utility
       ===================================================== */

    clampChannel(value) {

        value =
            Number(value);


        if (
            !Number.isFinite(value)
        ) {

            return 0;
        }


        return Math.max(
            0,
            Math.min(
                255,
                Math.round(value)
            )
        );
    }


    /* =====================================================
       Export
       ===================================================== */

    downloadPNG(
        filename = "julia-set.png"
    ) {

        /*
         * Ensure the latest ImageData is visible
         * before exporting.
         */
        this.present();


        const link =
            document.createElement(
                "a"
            );


        link.download =
            filename;

        link.href =
            this.canvas.toDataURL(
                "image/png"
            );


        link.click();
    }


    /* =====================================================
       Raw data access

       Useful later for debugging or extending the
       renderer without exposing implementation details
       throughout the application.
       ===================================================== */

    getImageData() {

        return this.imageData;
    }


    getValues() {

        return this.values;
    }


    getComputedMap() {

        return this.computed;
    }


    getInsideMap() {

        return this.inside;
    }
}
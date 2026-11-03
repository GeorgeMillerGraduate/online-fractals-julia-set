class JuliaProcessor {

    /*
     * Static utility class.
     */
    constructor() {

        throw new Error(
            "JuliaProcessor is a static class and cannot be instantiated."
        );
    }


    /* =====================================================
       Main Julia calculation
       ===================================================== */

    static process(
        startX,
        startY,
        cReal,
        cImag,
        maxIterations = 500,
        bailout = 4.0
    ) {

        JuliaProcessor.validateInputs(
            startX,
            startY,
            cReal,
            cImag,
            maxIterations,
            bailout
        );


        /*
         * Julia-set difference from Mandelbrot:
         *
         * Mandelbrot:
         *
         *     z0 = 0
         *     c  = pixel coordinate
         *
         * Julia:
         *
         *     z0 = pixel coordinate
         *     c  = fixed user-selected constant
         *
         * The canvas coordinate therefore becomes
         * our INITIAL z value.
         */
        let zx =
            startX;

        let zy =
            startY;


        /*
         * Cache squares.
         *
         * This avoids recalculating:
         *
         *     zx * zx
         *     zy * zy
         *
         * multiple times during each iteration.
         */
        let zx2 =
            zx * zx;

        let zy2 =
            zy * zy;


        /*
         * A Julia coordinate may already lie beyond
         * the bailout radius before an iteration is
         * performed.
         */
        if (
            zx2 + zy2 >
            bailout
        ) {

            return new JuliaOutput(
                0,
                zx,
                zy,
                false
            );
        }


        /*
         * Main quadratic Julia iteration:
         *
         *     z(n+1) = z(n)^2 + c
         *
         * Expanded into real and imaginary parts:
         *
         *     newX = zx² - zy² + cReal
         *
         *     newY = 2*zx*zy + cImag
         */
        for (
            let iteration = 0;
            iteration < maxIterations;
            iteration++
        ) {

            /*
             * IMPORTANT:
             *
             * new Y must use the OLD zx and zy.
             */
            const newY =
                2.0 *
                zx *
                zy +
                cImag;


            const newX =
                zx2 -
                zy2 +
                cReal;


            zx =
                newX;

            zy =
                newY;


            /*
             * Cache new squares.
             */
            zx2 =
                zx * zx;

            zy2 =
                zy * zy;


            /*
             * Escape test.
             *
             * We compare |z|² rather than calculating
             * sqrt(zx² + zy²).
             *
             * The default bailout is 4 because:
             *
             *     escape radius = 2
             *     radius²       = 4
             */
            if (
                zx2 + zy2 >
                bailout
            ) {

                return new JuliaOutput(
                    iteration + 1,
                    zx,
                    zy,
                    false
                );
            }
        }


        /*
         * The coordinate remained bounded for the
         * complete iteration limit.
         */
        return new JuliaOutput(
            maxIterations,
            zx,
            zy,
            true
        );
    }


    /* =====================================================
       Fast raw calculation

       Same mathematics as process(), but returns only
       whether the point belongs to the set.

       This can be useful later for previews, masks or
       other operations where we don't need JuliaOutput.
       ===================================================== */

    static isInSet(
        startX,
        startY,
        cReal,
        cImag,
        maxIterations = 500,
        bailout = 4.0
    ) {

        let zx =
            startX;

        let zy =
            startY;


        let zx2 =
            zx * zx;

        let zy2 =
            zy * zy;


        if (
            zx2 + zy2 >
            bailout
        ) {

            return false;
        }


        for (
            let iteration = 0;
            iteration < maxIterations;
            iteration++
        ) {

            const newY =
                2.0 *
                zx *
                zy +
                cImag;


            const newX =
                zx2 -
                zy2 +
                cReal;


            zx =
                newX;

            zy =
                newY;


            zx2 =
                zx * zx;

            zy2 =
                zy * zy;


            if (
                zx2 + zy2 >
                bailout
            ) {

                return false;
            }
        }


        return true;
    }


    /* =====================================================
       Iteration count only

       Useful if we later want a very lightweight worker
       implementation without constructing output objects.
       ===================================================== */

    static getIterationCount(
        startX,
        startY,
        cReal,
        cImag,
        maxIterations = 500,
        bailout = 4.0
    ) {

        let zx =
            startX;

        let zy =
            startY;


        let zx2 =
            zx * zx;

        let zy2 =
            zy * zy;


        if (
            zx2 + zy2 >
            bailout
        ) {

            return 0;
        }


        for (
            let iteration = 0;
            iteration < maxIterations;
            iteration++
        ) {

            const newY =
                2.0 *
                zx *
                zy +
                cImag;


            const newX =
                zx2 -
                zy2 +
                cReal;


            zx =
                newX;

            zy =
                newY;


            zx2 =
                zx * zx;

            zy2 =
                zy * zy;


            if (
                zx2 + zy2 >
                bailout
            ) {

                return (
                    iteration +
                    1
                );
            }
        }


        return maxIterations;
    }


    /* =====================================================
       Calculate final orbit state

       Primarily useful for debugging and testing.
       ===================================================== */

    static calculateOrbit(
        startX,
        startY,
        cReal,
        cImag,
        maxIterations = 500,
        bailout = 4.0
    ) {

        JuliaProcessor.validateInputs(
            startX,
            startY,
            cReal,
            cImag,
            maxIterations,
            bailout
        );


        let zx =
            startX;

        let zy =
            startY;


        let zx2 =
            zx * zx;

        let zy2 =
            zy * zy;


        const orbit = [];


        orbit.push({

            iteration:
                0,

            x:
                zx,

            y:
                zy,

            magnitudeSquared:
                zx2 + zy2
        });


        if (
            zx2 + zy2 >
            bailout
        ) {

            return orbit;
        }


        for (
            let iteration = 0;
            iteration < maxIterations;
            iteration++
        ) {

            const newY =
                2.0 *
                zx *
                zy +
                cImag;


            const newX =
                zx2 -
                zy2 +
                cReal;


            zx =
                newX;

            zy =
                newY;


            zx2 =
                zx * zx;

            zy2 =
                zy * zy;


            orbit.push({

                iteration:
                    iteration + 1,

                x:
                    zx,

                y:
                    zy,

                magnitudeSquared:
                    zx2 + zy2
            });


            if (
                zx2 + zy2 >
                bailout
            ) {

                break;
            }
        }


        return orbit;
    }


    /* =====================================================
       Validation
       ===================================================== */

    static validateInputs(
        startX,
        startY,
        cReal,
        cImag,
        maxIterations,
        bailout
    ) {

        JuliaProcessor.validateFiniteNumber(
            startX,
            "Starting X"
        );


        JuliaProcessor.validateFiniteNumber(
            startY,
            "Starting Y"
        );


        JuliaProcessor.validateFiniteNumber(
            cReal,
            "Julia constant real component"
        );


        JuliaProcessor.validateFiniteNumber(
            cImag,
            "Julia constant imaginary component"
        );


        if (
            !Number.isInteger(
                maxIterations
            ) ||
            maxIterations < 1
        ) {

            throw new RangeError(
                "Maximum iterations must be a positive integer."
            );
        }


        if (
            typeof bailout !== "number" ||
            !Number.isFinite(bailout) ||
            bailout <= 0
        ) {

            throw new RangeError(
                "Bailout must be a positive finite number."
            );
        }
    }


    static validateFiniteNumber(
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
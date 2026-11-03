class JuliaOutput {

    /**
     * Result of calculating one Julia-set coordinate.
     *
     * @param {number} iterations
     * @param {number} finalX
     * @param {number} finalY
     * @param {boolean} inSet
     */
    constructor(
        iterations = 0,
        finalX = 0.0,
        finalY = 0.0,
        inSet = false
    ) {

        this.iterations =
            iterations;

        this.finalX =
            finalX;

        this.finalY =
            finalY;

        this.inSet =
            inSet;
    }


    /* =====================================================
       Iterations
       ===================================================== */

    getIterations() {

        return this.iterations;
    }


    setIterations(iterations) {

        if (
            !Number.isInteger(iterations) ||
            iterations < 0
        ) {

            throw new RangeError(
                "Iterations must be a non-negative integer."
            );
        }


        this.iterations =
            iterations;


        return this;
    }


    /* =====================================================
       Final orbit X
       ===================================================== */

    getFinalX() {

        return this.finalX;
    }


    setFinalX(finalX) {

        if (
            typeof finalX !== "number" ||
            !Number.isFinite(finalX)
        ) {

            throw new TypeError(
                "Final X must be a finite number."
            );
        }


        this.finalX =
            finalX;


        return this;
    }


    /* =====================================================
       Final orbit Y
       ===================================================== */

    getFinalY() {

        return this.finalY;
    }


    setFinalY(finalY) {

        if (
            typeof finalY !== "number" ||
            !Number.isFinite(finalY)
        ) {

            throw new TypeError(
                "Final Y must be a finite number."
            );
        }


        this.finalY =
            finalY;


        return this;
    }


    /* =====================================================
       Set membership
       ===================================================== */

    isInSet() {

        return this.inSet;
    }


    setInSet(inSet) {

        this.inSet =
            Boolean(inSet);


        return this;
    }


    hasEscaped() {

        return !this.inSet;
    }


    /* =====================================================
       Final magnitude squared
       ===================================================== */

    getMagnitudeSquared() {

        return (
            this.finalX *
            this.finalX
            +
            this.finalY *
            this.finalY
        );
    }


    /* =====================================================
       Final magnitude
       ===================================================== */

    getMagnitude() {

        return Math.sqrt(
            this.getMagnitudeSquared()
        );
    }


    /* =====================================================
       Smooth iteration value
       ===================================================== */

    getSmoothIteration() {

        /*
         * Points that remain bounded have no
         * meaningful escape-time interpolation.
         */
        if (this.inSet) {

            return this.iterations;
        }


        const magnitudeSquared =
            this.getMagnitudeSquared();


        if (
            !Number.isFinite(
                magnitudeSquared
            ) ||
            magnitudeSquared <= 1.0
        ) {

            return this.iterations;
        }


        /*
         * |z|
         */
        const magnitude =
            Math.sqrt(
                magnitudeSquared
            );


        /*
         * Continuous escape-time colouring:
         *
         * n + 1 -
         * log(log(|z|)) / log(2)
         *
         * This gives us a continuous value instead
         * of visible integer iteration bands.
         */
        const logMagnitude =
            Math.log(
                magnitude
            );


        if (
            !Number.isFinite(
                logMagnitude
            ) ||
            logMagnitude <= 0.0
        ) {

            return this.iterations;
        }


        const smooth =
            this.iterations +
            1.0 -
            (
                Math.log(
                    logMagnitude
                ) /
                Math.LN2
            );


        if (
            !Number.isFinite(
                smooth
            )
        ) {

            return this.iterations;
        }


        return smooth;
    }


    /* =====================================================
       Copy
       ===================================================== */

    clone() {

        return new JuliaOutput(
            this.iterations,
            this.finalX,
            this.finalY,
            this.inSet
        );
    }


    /* =====================================================
       Object representation
       ===================================================== */

    toObject() {

        return {

            iterations:
                this.iterations,

            finalX:
                this.finalX,

            finalY:
                this.finalY,

            inSet:
                this.inSet,

            escaped:
                !this.inSet
        };
    }


    /* =====================================================
       Utility
       ===================================================== */

    toString() {

        return (
            "JuliaOutput(" +
            `iterations=${this.iterations}, ` +
            `finalX=${this.finalX}, ` +
            `finalY=${this.finalY}, ` +
            `inSet=${this.inSet}` +
            ")"
        );
    }
}
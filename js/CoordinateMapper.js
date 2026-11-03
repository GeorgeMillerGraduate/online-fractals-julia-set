class CoordinateMapper {

    constructor(
        width,
        height
    ) {

        if (
            !Number.isInteger(width) ||
            width < 2
        ) {

            throw new RangeError(
                "Width must be an integer of at least 2."
            );
        }


        if (
            !Number.isInteger(height) ||
            height < 2
        ) {

            throw new RangeError(
                "Height must be an integer of at least 2."
            );
        }


        this.width =
            width;

        this.height =
            height;


        /*
         * Default Julia-set viewport.
         *
         * At magnification 1 the complex-plane
         * width is 4 units.
         */
        this.defaultCenterX =
            0.0;

        this.defaultCenterY =
            0.0;

        this.defaultMagnification =
            1.0;


        this.centerX =
            this.defaultCenterX;

        this.centerY =
            this.defaultCenterY;

        this.magnification =
            this.defaultMagnification;


        /*
         * Calculated plane bounds.
         */
        this.planeWidth =
            0.0;

        this.planeHeight =
            0.0;

        this.minX =
            0.0;

        this.maxX =
            0.0;

        this.minY =
            0.0;

        this.maxY =
            0.0;


        /*
         * Distance between neighbouring canvas
         * pixel coordinates in the complex plane.
         */
        this.pixelWidth =
            0.0;

        this.pixelHeight =
            0.0;


        this.recalculate();
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


    setDimensions(
        width,
        height
    ) {

        if (
            !Number.isInteger(width) ||
            width < 2
        ) {

            throw new RangeError(
                "Width must be an integer of at least 2."
            );
        }


        if (
            !Number.isInteger(height) ||
            height < 2
        ) {

            throw new RangeError(
                "Height must be an integer of at least 2."
            );
        }


        this.width =
            width;

        this.height =
            height;


        this.recalculate();
    }


    /* =====================================================
       Centre
       ===================================================== */

    setCenter(
        x,
        y
    ) {

        this.validateFiniteNumber(
            x,
            "Centre X"
        );

        this.validateFiniteNumber(
            y,
            "Centre Y"
        );


        this.centerX =
            x;

        this.centerY =
            y;


        this.recalculate();
    }


    setCenterX(x) {

        this.validateFiniteNumber(
            x,
            "Centre X"
        );


        this.centerX =
            x;


        this.recalculate();
    }


    setCenterY(y) {

        this.validateFiniteNumber(
            y,
            "Centre Y"
        );


        this.centerY =
            y;


        this.recalculate();
    }


    getCenterX() {

        return this.centerX;
    }


    getCenterY() {

        return this.centerY;
    }


    /* =====================================================
       Magnification
       ===================================================== */

    setMagnification(
        magnification
    ) {

        if (
            typeof magnification !== "number" ||
            !Number.isFinite(magnification) ||
            magnification <= 0
        ) {

            throw new RangeError(
                "Magnification must be a positive finite number."
            );
        }


        this.magnification =
            magnification;


        this.recalculate();
    }


    getMagnification() {

        return this.magnification;
    }


    /* =====================================================
       Recalculate viewport
       ===================================================== */

    recalculate() {

        /*
         * Magnification 1:
         *
         *     plane width = 4
         *
         * Magnification 10:
         *
         *     plane width = 0.4
         *
         * Magnification 100:
         *
         *     plane width = 0.04
         */
        this.planeWidth =
            4.0 /
            this.magnification;


        /*
         * Preserve the canvas aspect ratio.
         */
        this.planeHeight =
            this.planeWidth *
            (
                this.height /
                this.width
            );


        const halfWidth =
            this.planeWidth /
            2.0;


        const halfHeight =
            this.planeHeight /
            2.0;


        this.minX =
            this.centerX -
            halfWidth;


        this.maxX =
            this.centerX +
            halfWidth;


        this.minY =
            this.centerY -
            halfHeight;


        this.maxY =
            this.centerY +
            halfHeight;


        /*
         * We map the first and last actual pixels
         * onto the exact plane boundaries.
         *
         * Therefore:
         *
         *     pixel 0         -> min
         *     pixel width - 1 -> max
         */
        this.pixelWidth =
            this.planeWidth /
            (
                this.width -
                1
            );


        this.pixelHeight =
            this.planeHeight /
            (
                this.height -
                1
            );
    }


    /* =====================================================
       Pixel -> Julia coordinate
       ===================================================== */

    pixelToCoordinate(
        pixelX,
        pixelY
    ) {

        return this.pixelToNumberCoordinate(
            pixelX,
            pixelY
        );
    }


    pixelToNumberCoordinate(
        pixelX,
        pixelY
    ) {

        this.validatePixelCoordinate(
            pixelX,
            pixelY
        );


        /*
         * Canvas X increases left -> right.
         *
         * Complex X also increases left -> right.
         */
        const x =
            this.minX +
            pixelX *
            this.pixelWidth;


        /*
         * Canvas Y increases top -> bottom.
         *
         * Complex Y increases bottom -> top.
         *
         * Therefore the Y axis is inverted.
         */
        const y =
            this.maxY -
            pixelY *
            this.pixelHeight;


        return {
            x: x,
            y: y
        };
    }


    /* =====================================================
       Julia coordinate -> pixel
       ===================================================== */

    coordinateToPixel(
        x,
        y
    ) {

        this.validateFiniteNumber(
            x,
            "Coordinate X"
        );

        this.validateFiniteNumber(
            y,
            "Coordinate Y"
        );


        const pixelX =
            (
                x -
                this.minX
            ) /
            this.pixelWidth;


        const pixelY =
            (
                this.maxY -
                y
            ) /
            this.pixelHeight;


        return {

            x:
                pixelX,

            y:
                pixelY
        };
    }


    /* =====================================================
       Zoom around a canvas point
       ===================================================== */

    zoomAtPixel(
        pixelX,
        pixelY,
        zoomFactor
    ) {

        if (
            typeof zoomFactor !== "number" ||
            !Number.isFinite(zoomFactor) ||
            zoomFactor <= 0
        ) {

            throw new RangeError(
                "Zoom factor must be positive."
            );
        }


        const coordinate =
            this.pixelToNumberCoordinate(
                pixelX,
                pixelY
            );


        /*
         * Make the selected point the new centre.
         */
        this.centerX =
            coordinate.x;

        this.centerY =
            coordinate.y;


        this.magnification *=
            zoomFactor;


        this.recalculate();
    }


    /* =====================================================
       Zoom to selected pixel rectangle
       ===================================================== */

    zoomToPixelBounds(
        x1,
        y1,
        x2,
        y2
    ) {

        this.validateFiniteNumber(
            x1,
            "Selection X1"
        );

        this.validateFiniteNumber(
            y1,
            "Selection Y1"
        );

        this.validateFiniteNumber(
            x2,
            "Selection X2"
        );

        this.validateFiniteNumber(
            y2,
            "Selection Y2"
        );


        /*
         * Sort selection coordinates.
         */
        let left =
            Math.min(
                x1,
                x2
            );


        let right =
            Math.max(
                x1,
                x2
            );


        let top =
            Math.min(
                y1,
                y2
            );


        let bottom =
            Math.max(
                y1,
                y2
            );


        /*
         * Clamp selection to the canvas.
         */
        left =
            this.clamp(
                left,
                0,
                this.width - 1
            );


        right =
            this.clamp(
                right,
                0,
                this.width - 1
            );


        top =
            this.clamp(
                top,
                0,
                this.height - 1
            );


        bottom =
            this.clamp(
                bottom,
                0,
                this.height - 1
            );


        const selectionWidth =
            right -
            left;


        const selectionHeight =
            bottom -
            top;


        /*
         * Ignore effectively empty selections.
         */
        if (
            selectionWidth < 1 ||
            selectionHeight < 1
        ) {

            return false;
        }


        /*
         * Centre of the selected rectangle.
         */
        const centrePixelX =
            (
                left +
                right
            ) /
            2.0;


        const centrePixelY =
            (
                top +
                bottom
            ) /
            2.0;


        /*
         * Convert selection centre to the
         * complex plane.
         */
        const newCentreX =
            this.minX +
            centrePixelX *
            this.pixelWidth;


        const newCentreY =
            this.maxY -
            centrePixelY *
            this.pixelHeight;


        /*
         * Determine zoom factor.
         *
         * Use whichever selection dimension gives
         * the smaller zoom factor so the complete
         * selected rectangle remains visible.
         */
        const zoomFactorX =
            (
                this.width -
                1
            ) /
            selectionWidth;


        const zoomFactorY =
            (
                this.height -
                1
            ) /
            selectionHeight;


        const zoomFactor =
            Math.min(
                zoomFactorX,
                zoomFactorY
            );


        this.centerX =
            newCentreX;


        this.centerY =
            newCentreY;


        this.magnification *=
            zoomFactor;


        this.recalculate();


        return true;
    }


    /* =====================================================
       Aspect-ratio-correct selection

       app.js can call this while the mouse is being
       dragged so the selection rectangle always has
       the same aspect ratio as the canvas.
       ===================================================== */

    constrainSelection(
        startX,
        startY,
        currentX,
        currentY
    ) {

        const canvasAspect =
            this.width /
            this.height;


        let deltaX =
            currentX -
            startX;


        let deltaY =
            currentY -
            startY;


        const signX =
            deltaX < 0
                ? -1
                : 1;


        const signY =
            deltaY < 0
                ? -1
                : 1;


        let absoluteX =
            Math.abs(
                deltaX
            );


        let absoluteY =
            Math.abs(
                deltaY
            );


        /*
         * Compare current selection aspect ratio
         * with the canvas aspect ratio.
         */
        if (absoluteY === 0) {

            absoluteY =
                absoluteX /
                canvasAspect;

        } else if (
            absoluteX /
            absoluteY >
            canvasAspect
        ) {

            /*
             * Selection is too wide.
             * Increase its height.
             */
            absoluteY =
                absoluteX /
                canvasAspect;

        } else {

            /*
             * Selection is too tall.
             * Increase its width.
             */
            absoluteX =
                absoluteY *
                canvasAspect;
        }


        deltaX =
            absoluteX *
            signX;


        deltaY =
            absoluteY *
            signY;


        return {

            startX:
                startX,

            startY:
                startY,

            endX:
                startX +
                deltaX,

            endY:
                startY +
                deltaY,

            width:
                absoluteX,

            height:
                absoluteY
        };
    }


    /* =====================================================
       Reset
       ===================================================== */

    reset() {

        this.centerX =
            this.defaultCenterX;


        this.centerY =
            this.defaultCenterY;


        this.magnification =
            this.defaultMagnification;


        this.recalculate();
    }


    /* =====================================================
       Plane information
       ===================================================== */

    getMinX() {

        return this.minX;
    }


    getMaxX() {

        return this.maxX;
    }


    getMinY() {

        return this.minY;
    }


    getMaxY() {

        return this.maxY;
    }


    getPlaneWidth() {

        return this.planeWidth;
    }


    getPlaneHeight() {

        return this.planeHeight;
    }


    getPixelWidth() {

        return this.pixelWidth;
    }


    getPixelHeight() {

        return this.pixelHeight;
    }


    getBounds() {

        return {

            minX:
                this.minX,

            maxX:
                this.maxX,

            minY:
                this.minY,

            maxY:
                this.maxY,

            width:
                this.planeWidth,

            height:
                this.planeHeight
        };
    }


    getView() {

        return {

            centerX:
                this.centerX,

            centerY:
                this.centerY,

            magnification:
                this.magnification
        };
    }


    /* =====================================================
       Utility
       ===================================================== */

    validatePixelCoordinate(
        x,
        y
    ) {

        if (
            typeof x !== "number" ||
            !Number.isFinite(x) ||
            typeof y !== "number" ||
            !Number.isFinite(y)
        ) {

            throw new TypeError(
                "Pixel coordinates must be finite numbers."
            );
        }
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


    clamp(
        value,
        minimum,
        maximum
    ) {

        return Math.max(
            minimum,
            Math.min(
                maximum,
                value
            )
        );
    }
}
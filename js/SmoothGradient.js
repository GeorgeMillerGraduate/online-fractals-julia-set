class SmoothGradient {

    constructor(
        entries = [],
        lookupSize = 4096
    ) {

        if (
            !Number.isInteger(lookupSize) ||
            lookupSize < 2
        ) {

            throw new RangeError(
                "Lookup size must be an integer of at least 2."
            );
        }


        this.entries =
            [];

        this.lookupSize =
            lookupSize;


        /*
         * Packed RGBA lookup table:
         *
         * R G B A R G B A ...
         */
        this.lookup =
            new Uint8ClampedArray(
                lookupSize * 4
            );


        this.lookupValid =
            false;


        if (
            Array.isArray(entries)
        ) {

            for (
                const entry of entries
            ) {

                this.addEntry(
                    entry,
                    false
                );
            }
        }


        this.sortEntries();


        if (
            this.entries.length > 0
        ) {

            this.buildLookup();
        }
    }


    /* =====================================================
       Entries
       ===================================================== */

    addEntry(
        entry,
        rebuild = true
    ) {

        if (
            !(entry instanceof GradientEntry)
        ) {

            throw new TypeError(
                "Gradient entry must be a GradientEntry."
            );
        }


        /*
         * Store our own copy so an external object
         * cannot silently change the gradient.
         */
        this.entries.push(
            entry.clone()
        );


        this.sortEntries();


        this.lookupValid =
            false;


        if (rebuild) {

            this.buildLookup();
        }


        return this;
    }


    addColour(
        position,
        red,
        green,
        blue,
        alpha = 255
    ) {

        return this.addEntry(
            new GradientEntry(
                position,
                red,
                green,
                blue,
                alpha
            )
        );
    }


    addHex(
        position,
        hex,
        alpha = 255
    ) {

        return this.addEntry(
            GradientEntry.fromHex(
                position,
                hex,
                alpha
            )
        );
    }


    removeEntry(
        index
    ) {

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.entries.length
        ) {

            return false;
        }


        this.entries.splice(
            index,
            1
        );


        this.lookupValid =
            false;


        this.buildLookup();


        return true;
    }


    clear() {

        this.entries.length =
            0;


        this.lookup.fill(
            0
        );


        this.lookupValid =
            false;


        return this;
    }


    setEntries(
        entries
    ) {

        if (
            !Array.isArray(entries)
        ) {

            throw new TypeError(
                "Entries must be an array."
            );
        }


        this.entries =
            [];


        for (
            const entry of entries
        ) {

            if (
                !(entry instanceof GradientEntry)
            ) {

                throw new TypeError(
                    "Every entry must be a GradientEntry."
                );
            }


            this.entries.push(
                entry.clone()
            );
        }


        this.sortEntries();

        this.lookupValid =
            false;

        this.buildLookup();


        return this;
    }


    getEntries() {

        return this.entries.map(
            entry =>
                entry.clone()
        );
    }


    getEntry(
        index
    ) {

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.entries.length
        ) {

            return null;
        }


        return this.entries[index];
    }


    getEntryCount() {

        return this.entries.length;
    }


    sortEntries() {

        this.entries.sort(
            (a, b) =>
                a.getPosition() -
                b.getPosition()
        );
    }


    /* =====================================================
       Update entry
       ===================================================== */

    updateEntry(
        index,
        position,
        red,
        green,
        blue,
        alpha = 255
    ) {

        const entry =
            this.getEntry(
                index
            );


        if (!entry) {

            return false;
        }


        entry.setPosition(
            position
        );


        entry.setColour(
            red,
            green,
            blue,
            alpha
        );


        this.sortEntries();


        this.lookupValid =
            false;


        this.buildLookup();


        return true;
    }


    updateEntryHex(
        index,
        position,
        hex
    ) {

        const entry =
            this.getEntry(
                index
            );


        if (!entry) {

            return false;
        }


        entry.setPosition(
            position
        );


        entry.setHex(
            hex
        );


        this.sortEntries();


        this.lookupValid =
            false;


        this.buildLookup();


        return true;
    }


    /* =====================================================
       Direct gradient calculation
       ===================================================== */

    getColour(
        position
    ) {

        if (
            typeof position !== "number" ||
            !Number.isFinite(position)
        ) {

            return {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            };
        }


        /*
         * Gradient coordinates are normalised.
         */
        position =
            this.clamp(
                position,
                0.0,
                1.0
            );


        const count =
            this.entries.length;


        /*
         * Empty gradient.
         */
        if (
            count === 0
        ) {

            return {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            };
        }


        /*
         * Single-colour gradient.
         */
        if (
            count === 1
        ) {

            return this.entries[0]
                .getColour();
        }


        /*
         * Outside the range of the first/last
         * control point: use the endpoint colour.
         */
        if (
            position <=
            this.entries[0]
                .getPosition()
        ) {

            return this.entries[0]
                .getColour();
        }


        if (
            position >=
            this.entries[
                count - 1
            ].getPosition()
        ) {

            return this.entries[
                count - 1
            ].getColour();
        }


        /*
         * Find the two entries surrounding the
         * requested position.
         *
         * We call them p1 and p2.
         *
         * Catmull-Rom additionally uses the point
         * immediately before and after them:
         *
         *     p0  p1  p2  p3
         */
        let segment =
            0;


        for (
            let i = 0;
            i < count - 1;
            i++
        ) {

            const left =
                this.entries[i]
                    .getPosition();


            const right =
                this.entries[i + 1]
                    .getPosition();


            if (
                position >= left &&
                position <= right
            ) {

                segment =
                    i;

                break;
            }
        }


        const i1 =
            segment;


        const i2 =
            Math.min(
                segment + 1,
                count - 1
            );


        const i0 =
            Math.max(
                i1 - 1,
                0
            );


        const i3 =
            Math.min(
                i2 + 1,
                count - 1
            );


        const entry0 =
            this.entries[i0];


        const entry1 =
            this.entries[i1];


        const entry2 =
            this.entries[i2];


        const entry3 =
            this.entries[i3];


        const x1 =
            entry1.getPosition();


        const x2 =
            entry2.getPosition();


        /*
         * Protect against duplicate control-point
         * positions.
         */
        let t;


        if (
            Math.abs(
                x2 - x1
            ) <
            Number.EPSILON
        ) {

            t =
                0.0;

        } else {

            t =
                (
                    position -
                    x1
                ) /
                (
                    x2 -
                    x1
                );
        }


        t =
            this.clamp(
                t,
                0.0,
                1.0
            );


        /*
         * Interpolate each channel independently.
         */
        const red =
            this.cubic(
                entry0.getRed(),
                entry1.getRed(),
                entry2.getRed(),
                entry3.getRed(),
                t
            );


        const green =
            this.cubic(
                entry0.getGreen(),
                entry1.getGreen(),
                entry2.getGreen(),
                entry3.getGreen(),
                t
            );


        const blue =
            this.cubic(
                entry0.getBlue(),
                entry1.getBlue(),
                entry2.getBlue(),
                entry3.getBlue(),
                t
            );


        const alpha =
            this.cubic(
                entry0.getAlpha(),
                entry1.getAlpha(),
                entry2.getAlpha(),
                entry3.getAlpha(),
                t
            );


        return {

            r:
                this.clampChannel(
                    red
                ),

            g:
                this.clampChannel(
                    green
                ),

            b:
                this.clampChannel(
                    blue
                ),

            a:
                this.clampChannel(
                    alpha
                )
        };
    }


    /* =====================================================
       Catmull-Rom interpolation
       ===================================================== */

    cubic(
        p0,
        p1,
        p2,
        p3,
        t
    ) {

        const t2 =
            t * t;


        const t3 =
            t2 * t;


        /*
         * Catmull-Rom spline:
         *
         * 0.5 * (
         *
         *     2p1
         *
         *   + (-p0 + p2)t
         *
         *   + (2p0 - 5p1 + 4p2 - p3)t²
         *
         *   + (-p0 + 3p1 - 3p2 + p3)t³
         *
         * )
         */
        return 0.5 * (

            (2.0 * p1)

            +

            (
                -p0 +
                p2
            ) *
            t

            +

            (
                2.0 * p0 -
                5.0 * p1 +
                4.0 * p2 -
                p3
            ) *
            t2

            +

            (
                -p0 +
                3.0 * p1 -
                3.0 * p2 +
                p3
            ) *
            t3
        );
    }


    /* =====================================================
       Lookup table
       ===================================================== */

    buildLookup() {

        /*
         * No control points.
         */
        if (
            this.entries.length ===
            0
        ) {

            this.lookup.fill(
                0
            );


            /*
             * Keep alpha opaque.
             */
            for (
                let i = 3;
                i < this.lookup.length;
                i += 4
            ) {

                this.lookup[i] =
                    255;
            }


            this.lookupValid =
                true;


            return this;
        }


        const denominator =
            this.lookupSize -
            1;


        for (
            let i = 0;
            i < this.lookupSize;
            i++
        ) {

            const position =
                i /
                denominator;


            const colour =
                this.getColour(
                    position
                );


            const offset =
                i * 4;


            this.lookup[
                offset
            ] =
                colour.r;


            this.lookup[
                offset + 1
            ] =
                colour.g;


            this.lookup[
                offset + 2
            ] =
                colour.b;


            this.lookup[
                offset + 3
            ] =
                colour.a;
        }


        this.lookupValid =
            true;


        return this;
    }


    /* =====================================================
       Fast lookup

       This is the method CanvasRenderer calls.
       ===================================================== */

    getLookupColour(
        position
    ) {

        if (
            !this.lookupValid
        ) {

            this.buildLookup();
        }


        if (
            typeof position !== "number" ||
            !Number.isFinite(position)
        ) {

            position =
                0.0;
        }


        position =
            this.clamp(
                position,
                0.0,
                1.0
            );


        const index =
            Math.min(
                this.lookupSize - 1,

                Math.max(
                    0,

                    Math.round(
                        position *
                        (
                            this.lookupSize -
                            1
                        )
                    )
                )
            );


        const offset =
            index * 4;


        return {

            r:
                this.lookup[
                    offset
                ],

            g:
                this.lookup[
                    offset + 1
                ],

            b:
                this.lookup[
                    offset + 2
                ],

            a:
                this.lookup[
                    offset + 3
                ]
        };
    }


    /* =====================================================
       Lookup configuration
       ===================================================== */

    setLookupSize(
        lookupSize
    ) {

        if (
            !Number.isInteger(
                lookupSize
            ) ||
            lookupSize < 2
        ) {

            throw new RangeError(
                "Lookup size must be an integer of at least 2."
            );
        }


        this.lookupSize =
            lookupSize;


        this.lookup =
            new Uint8ClampedArray(
                lookupSize * 4
            );


        this.lookupValid =
            false;


        this.buildLookup();


        return this;
    }


    getLookupSize() {

        return this.lookupSize;
    }


    /* =====================================================
       Reverse gradient
       ===================================================== */

    reverse() {

        /*
         * Reversing a gradient means:
         *
         *     new position = 1 - old position
         *
         * The colours themselves remain attached
         * to their control points.
         */
        for (
            const entry of
                this.entries
        ) {

            entry.setPosition(
                1.0 -
                entry.getPosition()
            );
        }


        this.sortEntries();


        this.lookupValid =
            false;


        this.buildLookup();


        return this;
    }


    /* =====================================================
       Evenly distribute entries
       ===================================================== */

    distributeEvenly() {

        const count =
            this.entries.length;


        if (
            count === 0
        ) {

            return this;
        }


        if (
            count === 1
        ) {

            this.entries[0]
                .setPosition(
                    0.0
                );


            this.lookupValid =
                false;


            this.buildLookup();


            return this;
        }


        const denominator =
            count - 1;


        for (
            let i = 0;
            i < count;
            i++
        ) {

            this.entries[i]
                .setPosition(
                    i /
                    denominator
                );
        }


        this.lookupValid =
            false;


        this.buildLookup();


        return this;
    }


    /* =====================================================
       CSS gradient

       Useful for #gradientPreview in the UI.
       ===================================================== */

    toCSSGradient() {

        if (
            this.entries.length ===
            0
        ) {

            return (
                "linear-gradient(" +
                "90deg, " +
                "#000000 0%, " +
                "#000000 100%" +
                ")"
            );
        }


        const stops =
            this.entries.map(
                entry => {

                    const percentage =
                        (
                            entry.getPosition() *
                            100.0
                        ).toFixed(
                            2
                        );


                    return (
                        entry.toCSS() +
                        " " +
                        percentage +
                        "%"
                    );
                }
            );


        return (
            "linear-gradient(" +
            "90deg, " +
            stops.join(", ") +
            ")"
        );
    }


    /* =====================================================
       Clone
       ===================================================== */

    clone() {

        return new SmoothGradient(
            this.getEntries(),
            this.lookupSize
        );
    }


    /* =====================================================
       Default Julia gradient

       Our five-stop palette.
       ===================================================== */

    static createDefault() {

        return new SmoothGradient([

            GradientEntry.fromHex(
                0.00,
                "#00086A"
            ),

            GradientEntry.fromHex(
                0.25,
                "#378BDA"
            ),

            GradientEntry.fromHex(
                0.50,
                "#F6FBE1"
            ),

            GradientEntry.fromHex(
                0.75,
                "#FDA000"
            ),

            GradientEntry.fromHex(
                1.00,
                "#00086A"
            )

        ]);
    }


    /* =====================================================
       Utility
       ===================================================== */

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


    clampChannel(
        value
    ) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {

            return 0;
        }


        return Math.max(
            0,
            Math.min(
                255,
                Math.round(
                    value
                )
            )
        );
    }
}
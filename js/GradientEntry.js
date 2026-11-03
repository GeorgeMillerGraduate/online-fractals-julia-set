class GradientEntry {

    /**
     * One colour control point in a gradient.
     *
     * position:
     *     Normalised position from 0.0 to 1.0.
     *
     * red, green, blue, alpha:
     *     Colour channels from 0 to 255.
     */
    constructor(
        position,
        red,
        green,
        blue,
        alpha = 255
    ) {

        this.position =
            0.0;

        this.red =
            0;

        this.green =
            0;

        this.blue =
            0;

        this.alpha =
            255;


        this.setPosition(
            position
        );


        this.setColour(
            red,
            green,
            blue,
            alpha
        );
    }


    /* =====================================================
       Position
       ===================================================== */

    getPosition() {

        return this.position;
    }


    setPosition(position) {

        if (
            typeof position !== "number" ||
            !Number.isFinite(position)
        ) {

            throw new TypeError(
                "Gradient position must be a finite number."
            );
        }


        if (
            position < 0.0 ||
            position > 1.0
        ) {

            throw new RangeError(
                "Gradient position must be between 0 and 1."
            );
        }


        this.position =
            position;


        return this;
    }


    /* =====================================================
       Red
       ===================================================== */

    getRed() {

        return this.red;
    }


    setRed(red) {

        this.red =
            GradientEntry.validateChannel(
                red,
                "Red"
            );


        return this;
    }


    /* =====================================================
       Green
       ===================================================== */

    getGreen() {

        return this.green;
    }


    setGreen(green) {

        this.green =
            GradientEntry.validateChannel(
                green,
                "Green"
            );


        return this;
    }


    /* =====================================================
       Blue
       ===================================================== */

    getBlue() {

        return this.blue;
    }


    setBlue(blue) {

        this.blue =
            GradientEntry.validateChannel(
                blue,
                "Blue"
            );


        return this;
    }


    /* =====================================================
       Alpha
       ===================================================== */

    getAlpha() {

        return this.alpha;
    }


    setAlpha(alpha) {

        this.alpha =
            GradientEntry.validateChannel(
                alpha,
                "Alpha"
            );


        return this;
    }


    /* =====================================================
       Set complete colour
       ===================================================== */

    setColour(
        red,
        green,
        blue,
        alpha = 255
    ) {

        this.red =
            GradientEntry.validateChannel(
                red,
                "Red"
            );


        this.green =
            GradientEntry.validateChannel(
                green,
                "Green"
            );


        this.blue =
            GradientEntry.validateChannel(
                blue,
                "Blue"
            );


        this.alpha =
            GradientEntry.validateChannel(
                alpha,
                "Alpha"
            );


        return this;
    }


    /* =====================================================
       Colour representations
       ===================================================== */

    getColour() {

        return {

            r:
                this.red,

            g:
                this.green,

            b:
                this.blue,

            a:
                this.alpha
        };
    }


    getRGBA() {

        return this.getColour();
    }


    /**
     * Return packed ARGB:
     *
     *     0xAARRGGBB
     *
     * This mirrors the representation used by the
     * original Java gradient implementation.
     */
    getARGB() {

        return (
            (
                (
                    this.alpha & 0xff
                ) << 24
            ) |

            (
                (
                    this.red & 0xff
                ) << 16
            ) |

            (
                (
                    this.green & 0xff
                ) << 8
            ) |

            (
                this.blue & 0xff
            )
        ) >>> 0;
    }


    /* =====================================================
       CSS colour
       ===================================================== */

    toCSS() {

        if (
            this.alpha ===
            255
        ) {

            return (
                "#" +
                GradientEntry.channelToHex(
                    this.red
                ) +
                GradientEntry.channelToHex(
                    this.green
                ) +
                GradientEntry.channelToHex(
                    this.blue
                )
            );
        }


        return (
            "rgba(" +
            this.red +
            ", " +
            this.green +
            ", " +
            this.blue +
            ", " +
            (
                this.alpha /
                255
            ) +
            ")"
        );
    }


    /* =====================================================
       Hex colour
       ===================================================== */

    toHex() {

        return (
            "#" +
            GradientEntry.channelToHex(
                this.red
            ) +
            GradientEntry.channelToHex(
                this.green
            ) +
            GradientEntry.channelToHex(
                this.blue
            )
        );
    }


    setHex(hex) {

        if (
            typeof hex !==
            "string"
        ) {

            throw new TypeError(
                "Hex colour must be a string."
            );
        }


        let value =
            hex.trim();


        if (
            value.startsWith("#")
        ) {

            value =
                value.substring(1);
        }


        /*
         * Support short CSS form:
         *
         *     #abc
         *
         * becomes:
         *
         *     #aabbcc
         */
        if (
            value.length === 3
        ) {

            value =
                value[0] +
                value[0] +
                value[1] +
                value[1] +
                value[2] +
                value[2];
        }


        if (
            !/^[0-9a-fA-F]{6}$/.test(
                value
            )
        ) {

            throw new Error(
                `Invalid hex colour: ${hex}`
            );
        }


        this.red =
            parseInt(
                value.substring(
                    0,
                    2
                ),
                16
            );


        this.green =
            parseInt(
                value.substring(
                    2,
                    4
                ),
                16
            );


        this.blue =
            parseInt(
                value.substring(
                    4,
                    6
                ),
                16
            );


        return this;
    }


    /* =====================================================
       Clone
       ===================================================== */

    clone() {

        return new GradientEntry(
            this.position,
            this.red,
            this.green,
            this.blue,
            this.alpha
        );
    }


    /* =====================================================
       Comparison
       ===================================================== */

    equals(other) {

        return (
            other instanceof
                GradientEntry &&

            this.position ===
                other.position &&

            this.red ===
                other.red &&

            this.green ===
                other.green &&

            this.blue ===
                other.blue &&

            this.alpha ===
                other.alpha
        );
    }


    /* =====================================================
       Utility
       ===================================================== */

    toString() {

        return (
            "GradientEntry(" +
            `position=${this.position}, ` +
            `red=${this.red}, ` +
            `green=${this.green}, ` +
            `blue=${this.blue}, ` +
            `alpha=${this.alpha}` +
            ")"
        );
    }


    /* =====================================================
       Static constructors
       ===================================================== */

    static fromHex(
        position,
        hex,
        alpha = 255
    ) {

        const entry =
            new GradientEntry(
                position,
                0,
                0,
                0,
                alpha
            );


        entry.setHex(
            hex
        );


        return entry;
    }


    static fromColour(
        position,
        colour
    ) {

        if (
            !colour ||
            typeof colour !==
                "object"
        ) {

            throw new TypeError(
                "Colour must be an object."
            );
        }


        return new GradientEntry(
            position,
            colour.r,
            colour.g,
            colour.b,
            colour.a ?? 255
        );
    }


    /* =====================================================
       Static utilities
       ===================================================== */

    static validateChannel(
        value,
        name = "Colour channel"
    ) {

        value =
            Number(value);


        if (
            !Number.isFinite(value)
        ) {

            throw new TypeError(
                `${name} must be a finite number.`
            );
        }


        /*
         * Colours generated by interpolation can be
         * fractional, so round them before storage.
         */
        value =
            Math.round(
                value
            );


        if (
            value < 0 ||
            value > 255
        ) {

            throw new RangeError(
                `${name} must be between 0 and 255.`
            );
        }


        return value;
    }


    static channelToHex(
        value
    ) {

        return GradientEntry
            .validateChannel(
                value
            )
            .toString(16)
            .padStart(
                2,
                "0"
            );
    }
}
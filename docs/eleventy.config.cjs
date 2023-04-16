const sass = require("sass");
const stylus = require("stylus");
const path = require("node:path");
const EleventyVitePlugin = require("@11ty/eleventy-plugin-vite");
const markdownItDefList = require("markdown-it-deflist");

const addJekyllFilters = (eleventyConfig) => {
    eleventyConfig.addFilter("relative_url", function(url) {
        return eleventyConfig.getFilter("url")(url);
    });
}

const addSassSupport = (eleventyConfig) => {
    eleventyConfig.addTemplateFormats("scss");
    eleventyConfig.addExtension("scss", {
        outputFileExtension: "css", // optional, default: "html"

        // `compile` is called once per .scss file in the input directory
        compile: async function(inputContent, inputPath) {
            let parsed = path.parse(inputPath);
            let result = sass.compileString(inputContent, {
                loadPaths: [
                    parsed.dir || ".",
                    this.config.dir.includes + '/_sass'
                ]
            });

            // This is the render function, `data` is the full data cascade
            return async (data) => {
                return result.css;
            };
        }
    });
}

const portFromJekyll = (eleventyConfig) => {
    eleventyConfig.amendLibrary("md", mdLib => mdLib.use(markdownItDefList));
    addSassSupport(eleventyConfig);
    // addJekyllFilters(eleventyConfig);

    // Turn off filename quoting in include tags
    eleventyConfig.setLiquidOptions({
        dynamicPartials: false
    });

    // Alias each layout file
    eleventyConfig.addLayoutAlias('default', 'layouts/default.html');
    eleventyConfig.addLayoutAlias('home', 'layouts/home.html');
    eleventyConfig.addLayoutAlias('page', 'layouts/page.html');
    eleventyConfig.addLayoutAlias('post', 'layouts/post.html');

    // Copy the `assets` directory to the compiled site folder
    eleventyConfig.addPassthroughCopy('assets');
}

const addFlatpickrFixes = (eleventyConfig) => {
    eleventyConfig.addPassthroughCopy({
        'node_modules/flatpickr/src/style/*.styl': 'assets/css/lgd/'
    });
}

module.exports = function(eleventyConfig) {
    const base = process.env.BASE_FOLDER || '';
    eleventyConfig.addPlugin(EleventyVitePlugin, {
        'viteOptions': {
            'base': base + '/'
        }
    });
    eleventyConfig.addShortcode("myBase", () => base );

    portFromJekyll(eleventyConfig);
    addFlatpickrFixes(eleventyConfig);

    return {
        dir: {
            input: './',
            output: './_site'
        },
        passthroughFileCopy: false
    };
};

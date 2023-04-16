module.exports = function() {
  return {
    "environment": process.env.ENVIRONMENT || "development",
    "header_pages": [
        "index.md",
        "lgd/index.md",
        "bbnl/index.md",
        "maps/SOI/index.md",
        "about.md"
    ],
    "style": "dark",
    "footer": "Source Code at: <a href=\"https://github.com/ramSeraph/testing-actions\">Github</a>",
    "repository": "ramSeraph/testing-actions"
  };
};

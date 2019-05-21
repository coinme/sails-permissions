"use strict";

const gulp = require("gulp");
const babel = require("gulp-babel");
const sourcemaps = require('gulp-sourcemaps');

const babel_config = {
    // presets: [
    //     ["env", {
    //         "targets": {
    //             "node": ["6.10"]
    //         }
    //     }]],
    // sourceMaps: "both"
};

gulp.task("default", function () {
    gulp.src("api/**")
        .pipe(sourcemaps.init())
        .pipe(babel(babel_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest("dist/api"));

    gulp.src("config/**")
        .pipe(babel(babel_config))
        .pipe(gulp.dest("dist/config"));
});

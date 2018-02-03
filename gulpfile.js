'use strict'


const gulp = require('gulp');

var	browserSync = require('browser-sync').create(),
	reload = browserSync.reload,
	sass = require('gulp-sass'),
	concat = require('gulp-concat'),
	rename = require('gulp-rename'),
	cssmin = require('gulp-minify-css'),
	sourcemaps = require('gulp-sourcemaps'),
	postcss = require('gulp-postcss'),
	autopref = require('autoprefixer'),
	autopref2 = require('gulp-autoprefixer'), //deprecated
	watch = require('gulp-watch'), 			  //deprecated
	imgmin = require('gulp-imagemin'),
	flatten = require('gulp-flatten'),
	watchDir = require('gulp-watch-dir'), 	  //deprecated
	debug = require('gulp-debug'),
	del = require('del'),
	chokidar = require('chokidar'),
	newer = require('gulp-newer'),
	remember = require('gulp-remember'),
	path = require('path'), 
	multipipe = require('multipipe'),
	notify = require('gulp-notify'),
	changed = require('gulp-changed'),         //deprecated
	uglify = require('gulp-uglify'),
	append = require('gulp-append'),
	insert = require('gulp-insert'); 		 


var params = {
	out: 'app/public',
	htmlSrc: 'app/index.html',
	levels: [], // for BEM
	fonts: 'app/fonts',
	fontsOut: 'app/public/fonts',
	images: 'common.blocks',
	imagesOut: 'app/public/img',
	jsSrc: 'app/js',
	jsOut: 'app/public/js',
	detectFirstRun: 0 
};

gulp.task(sassTocss);
gulp.task(images);
gulp.task(js);
function sassTocss() {
		console.log('\t=== sassTocss ===');
		return multipipe( gulp.src(['app/fonts-style/**/*.sass', 'app/common.blocks/**/*.sass'], {since: gulp.lastRun('sassTocss')}),
		sourcemaps.init(),
		remember('sassTocss'),
		sass(),
		cssmin(),
		postcss([autopref()]),
		concat('styles.css'),
		debug({title: 'concat:'}),
		sourcemaps.write('.'),
		gulp.dest(params.out)
		).on('error', notify.onError(function(err){
			return {
				title: 'sassTocss',
				message: err.message
			}
		}))
		 .pipe(reload({ stream: true }));
	}
function images(){
	console.log('\t=== images ===');
	return gulp.src('app/common.blocks/**/*.{jpg,jpeg,gif,svg,png}')
	.pipe(flatten())
	.pipe(newer(params.imagesOut))
	.pipe(imgmin())
	.pipe(gulp.dest(params.imagesOut));

}
function detectFirstRunCall(run){
  	if(run == 1){
  		// ЗАПАРАЛЕЛИТЬ!!!!
  		sassTocss();
  		images();
  		js();
  	}
  }
function js(){
	console.log('\t=== js ===');
	return multipipe( 
		gulp.src('app/common.blocks/**/*.js', {since: gulp.lastRun('js')}),
		remember('js'),
		concat('blocks.tmp.js'),
		insert.prepend('$(document).ready(function(){'), //for jquery
		insert.append('});'),							 //for jquery
		uglify(),
		debug({title: 'uglify'}),
		gulp.dest(params.jsOut)

		).on('error', notify.onError(function(err){
			return {
				title: 'js',
				message: err.message
			}
		})).pipe(reload({ stream: true }));
}

gulp.task('js:delTmp',  function(){
		   return del(params.jsOut + '/**/*.tmp.js')
});

gulp.task('js:allConcat', function(){
	return multipipe( gulp.src(params.jsOut + '/**/*.js'),
		   uglify(),
		   concat('scripts.js'),
		   gulp.dest(params.jsOut)
		   ).on('error', notify.onError(function(err){
			return {
				title: 'js',
				message: err.message
			}
		})).pipe(reload({ stream: true }));
});
gulp.task('js:prod', gulp.series('js:allConcat', 'js:delTmp'))

gulp.task('js:libs', function(){
	console.log('\t=== js:libs ===');
	return gulp.src(params.jsSrc + '/**/*.js')
			.pipe(concat('libs.tmp.js'))
			.pipe(uglify())
			.pipe(gulp.dest(params.jsOut))
			.pipe(reload({ stream: true }));
});

gulp.task('server', function(){
	
	browserSync.init({
		server: {
			baseDir: params.out
		}
		
	}
	);
	gulp.watch('app/*.html', gulp.series('html'));

});
gulp.task('html', function(){
	console.log('\t=== html ===');
	 return gulp.src(params.htmlSrc)
	.pipe(rename('index.html'))
	.pipe(gulp.dest(params.out))
	.pipe(reload({ stream: true }));
});
gulp.task('fonts', function(){
	console.log('\t=== fonts ===');
	return gulp.src(params.fonts + '/**/*')
	.pipe(gulp.dest(params.fontsOut));
});
gulp.task('watch', function(){
	
		var watcher = chokidar.watch('app/common.blocks/', {
		  ignored: /(^|[\/\\])\../,
		  persistent: true
		});
	
	// Something to use when events are received.
	var log = console.log.bind(console);
	// Add event listeners.

	watcher
	  .on('add', function(path){
	  	console.log('File', path, 'has been added');
	  	detectFirstRunCall(params.detectFirstRun);
	  })
	  .on('change', function(path){
	  	console.log('File', path, 'has been changed');
	  	detectFirstRunCall(params.detectFirstRun);
	  })
	  .on('unlink', function(filepath){
	  	console.log('File', filepath, 'has been removed');
	  	remember.forget('sassTocss', path.resolve(filepath));
	  	remember.forget('js', path.resolve(filepath));
	  	detectFirstRunCall(params.detectFirstRun);
	  	
	  })
	  .on('addDir', function(path){
	  	console.log('Directory', path, 'has been added');
	  	detectFirstRunCall(params.detectFirstRun);
	  })
	  .on('unlinkDir', function(path){
	  	console.log('Directory', path, 'has been removed');
	  	detectFirstRunCall(params.detectFirstRun);
	  })
	  .on('error', error => log(`Watcher error: ${error}`))
	  .on('ready', function(){
			params.detectFirstRun = 1;
			console.log('\n\tInitial scan complete. Ready for changes\n');
			console.log('\t==== First run is executed! State of varible = ' + params.detectFirstRun + ' ====\n');
		} 
	);
});
gulp.task('clean', function(){
	return del(params.out);
});
gulp.task('build', gulp.series( gulp.parallel(
				'html',
				'sassTocss',
				'fonts',
				'images',
				'js:libs',
				'js'
				)
				
			));

gulp.task('default', gulp.series('build', gulp.parallel('watch', 'server'))) ;

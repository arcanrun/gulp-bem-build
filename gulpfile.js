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
	append = require('gulp-append'),		   //deprecated
	insert = require('gulp-insert'); 		 


var params = {
	out: 'app/public',
	htmlSrc: 'app/index.html',
	levels: [], // for BEM
	cssSrc: 'app/assets/css',
	cssOut: 'app/public/style',
	fonts: 'app/assets/fonts',
	fontsOut: 'app/public/fonts',
	images: 'common.blocks',
	imagesOut: 'app/public/img',
	jsSrc: 'app/assets/js',
	jsOut: 'app/public/js',
	detectFirstRun: 0 
};

gulp.task(sassTocss);
gulp.task(images);
gulp.task(js);
function sassTocss() {
		console.log('\t=== sassTocss ===');
		return multipipe( gulp.src(['app/assets/fonts-style/**/*.sass', 'app/common.blocks/**/*.sass'], {since: gulp.lastRun('sassTocss')}),
		sourcemaps.init(),
		remember('sassTocss'),
		sass(),
		postcss([autopref()]),
		cssmin(),
		concat('blocks.tmp.css'),
		debug({title: 'concat:'}),

		sourcemaps.write('.'),
		gulp.dest(params.cssOut)
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
function detectFirstRunCall(run, opt){
  	if(opt == 1) {
	  	if(run == 1){
	  		// ЗАПАРАЛЕЛИТЬ!!!!
	  		sassTocss();
	  		images();
	  		
	  	}	
	  }else{
	  	if(run == 1){
  		// ЗАПАРАЛЕЛИТЬ!!!!
  		sassTocss();
  		images();
  		js();
  	}
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
		gulp.dest(params.jsOut)

		).on('error', notify.onError(function(err){
			return {
				title: 'js',
				message: err.message
			}
		})).pipe(reload({ stream: true }));
}

gulp.task('css:libs', function(){
	return multipipe(
			gulp.src(params.cssSrc + '/**/*.css'),
			concat('libs.tmp.css'),
			gulp.dest(params.cssOut)
			).on('error', notify.onError(function(err){
			return {
				title: 'css:libs',
				message: err.message
			}
		})).pipe(reload({ stream: true }));
});

gulp.task('js:delTmp',  function(){
		return del(params.jsOut + '/**/*.tmp.js')
});

gulp.task('css:delTmp', function(){
	 return del(params.cssOut + '/**/*.tmp.css')
});

gulp.task('js:allConcat', function(){
	return multipipe( gulp.src([params.jsOut + '/**/libs.tmp.js', params.jsOut + '/**/blocks.tmp.js']),
		   uglify(),
		   concat('scripts.js'),
		   gulp.dest(params.jsOut)
		   ).on('error', notify.onError(function(err){
			return {
				title: 'js:allConcat',
				message: err.message
			}
		})).pipe(reload({ stream: true }));
});

gulp.task('css:allConcat', function(){
	return multipipe( gulp.src(params.cssOut + '/**/*.css'),
		   cssmin(),
		   concat('styles.css'),
		   gulp.dest(params.cssOut)
		   ).on('error', notify.onError(function(err){
			return {
				title: 'css',
				message: err.message
			}
		})).pipe(reload({ stream: true }));
});


gulp.task('css:prod', gulp.series('css:allConcat', 'css:delTmp'));
gulp.task('js:prod', gulp.series('js:allConcat', 'js:delTmp'));
gulp.task('prod', gulp.parallel('css:prod', 'js:prod'));

gulp.task('js:libs', function(){
	console.log('\t=== js:libs ===');
	return gulp.src(params.jsSrc + '/**/*.js')
			.pipe(concat('libs.tmp.js'))
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
	
	var watcherSass = chokidar.watch('app/common.blocks/**/*.sass', {
	  ignored: /(^|[\/\\])\../,
	  persistent: true
	});

	var watcherJs = chokidar.watch('app/common.blocks/**/*.js', {
	  ignored: /(^|[\/\\])\../,
	  persistent: true
	});

	var watcherDir = chokidar.watch('app/common.blocks/', {
	  ignored: /(^|[\/\\])\../,
	  persistent: true
	});

	var log = console.log.bind(console);
	
	if( params.detectFirstRun == 0){}

	watcherSass
	  .on('add', function(path){
	  	console.log('File', path, 'has been added');
	  	detectFirstRunCall(params.detectFirstRun, 1);
	  })
	  .on('change', function(path){
	  	console.log('File', path, 'has been changed');
	  	detectFirstRunCall(params.detectFirstRun, 1);
	  })
	  .on('unlink', function(filepath){
	  	console.log('File', filepath, 'has been removed');
	  	remember.forget('sassTocss', path.resolve(filepath));
	  	remember.forget('js', path.resolve(filepath));
	  	detectFirstRunCall(params.detectFirstRun, 1);
	  	
	  })
	  .on('addDir', function(path){
	  	console.log('Directory', path, 'has been added');
	  	detectFirstRunCall(params.detectFirstRun, 1);
	  })
	  .on('unlinkDir', function(path){
	  	console.log('Directory', path, 'has been removed');
	  	detectFirstRunCall(params.detectFirstRun, 1);
	  })
	  .on('error', error => log(`Watcher error: ${error}`))
	  



	watcherJs
	  .on('add', function(path){
	  	console.log('File', path, 'has been added');
	  	detectFirstRunCall(params.detectFirstRun, 2);
	  })
	  .on('change', function(path){
	  	console.log('File', path, 'has been changed');
	  	detectFirstRunCall(params.detectFirstRun, 2);
	  })
	  .on('unlink', function(filepath){
	  	console.log('File', filepath, 'has been removed');
	  	remember.forget('sassTocss', path.resolve(filepath));
	  	remember.forget('js', path.resolve(filepath));
	  	detectFirstRunCall(params.detectFirstRun, 2);
	  	
	  })
	  .on('addDir', function(path){
	  	console.log('Directory', path, 'has been added');
	  	detectFirstRunCall(params.detectFirstRun, 2);
	  })
	  .on('unlinkDir', function(path){
	  	console.log('Directory', path, 'has been removed');
	  	detectFirstRunCall(params.detectFirstRun, 2);
	  })
	  .on('error', error => log(`Watcher error: ${error}`))
	 
	  watcherDir
	  .on('addDir', function(path){
	  	console.log('Directory', path, 'has been added');
	  	detectFirstRunCall(params.detectFirstRun, 2);
	  })
	  .on('unlinkDir', function(path){
	  	console.log('Directory', path, 'has been removed');
	  	detectFirstRunCall(params.detectFirstRun, 2);
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
				'css:libs',
				'sassTocss',
				'fonts',
				'images',
				'js:libs',
				'js'
				)
				
			));

gulp.task('default', gulp.series('build', gulp.parallel('watch', 'server'))) ;

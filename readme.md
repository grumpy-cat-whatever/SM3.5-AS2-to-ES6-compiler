# Resources for porting SM3.5 to EcmaScript/TypeScript

> **License notice:**
> This project is licensed under the [Apache 2.0 license](./LICENSE).
> It provides automation tools for SM3.5 source files written in ActionScript 2 to be converted into more useful programming languages.
>
> The generated code, on the other hand, will most likely **retain the license of the original files**.
> This notice is strictly informative, it is a layperson's interpretation of copyright law.

I have long since abandoned my personal project to port SM3.5 to [the web platform](https://en.wikipedia.org/wiki/Web_platform).
Since I've made significant progress, though, I've been polishing what I have - in preparation for this release - in the hopes that someone picks up where I left off.
Certainly didn't help that I dropped off the face of the earth for about a year, though.

I'd personally still like to see this happen, but momentum in the community Discord has picked up for a re-imagining of SM in Unity (working title: SM4).
These resources will primarily be of use in *porting* this game, *not* in making a new game from the ground up.

**This is for developers, NOT for players. It is NOT a game, not even a demo.**

Back in 2019, I started hatching a plan to port SM3.5 to the web platform. My plan included the following steps:

1. Convert the ActionScript 2 code base to something that compiles to JavaScript
2. Replace all the Flash parts, i.e. Input/Output and Display APIs (like Stage and MovieClip, ...)
3. Deploy on a suitable platform

How does one actually do this?

1. **Write a source-to-source compiler.** This is the part I am releasing right now :-) But manual labor will still be required to get it the rest of the way there.
2. Adobe published [`CreateJS`](https://createjs.com/docs) to make it easier to port ActionScript 3 apps to the web. Some of the concepts will be vaguely familiar to AS2 Developers (like the Stage and MovieClip APIs).
3. I think it would be best to make a desktop application out of it with [`electron`](https://www.electronjs.org/). Web hosting would be too tricky and in my opinion, less convenient (offline is a must for me).


## Q & A

> **Q:&nbsp;** What is in this release?

**A:&nbsp;** A forkable Github project with a source-to-source compiler, which takes SM3.5's ActionScript 2 Code as input and outputs *syntactically correct* JavaScript/TypeScript. And [a set of SM3.5 source files (*.as only)](https://github.com/grumpy-cat-whatever/SMAC), which were modified to avoid syntax errors when compiled to JS/TS.

> **Q:&nbsp;** What does *syntactically correct* mean?

*Syntactically correct* means it will **parse** successfully, but not necessarily **run** successfully. Which means manual adjustment will be unavoidable (but hopefully reasonable in scope).

There was one task I identified that would've been too big to do manually, so I set out to automate it (which eventually led to this release). That task is resolving **implicit** `this`. In ActionScript 2, but **not** in ActionScript 3, or any other close language relative, you can do this:
```ActionScript
class myClass {
  var foo = 'foo';
  function myMethod(){
    trace(foo);
  }
}
```
In EcmaScript 6, it would look like the following. Notice that it is now `this.foo`, not simply `foo`. In both ActionScript 3 and JavaScript, the engine will **not** look for `foo` in `this` unless specifically instructed to do so:
```JavaScript
class myClass {
  foo = 'foo';
  myMethod(){
    console.log(this.foo); //fine
    console.log(foo); //ReferenceError: foo is not defined
  }
}
```

> **Q:&nbsp;** So what's actually left to do?

**A:&nbsp;** A lot, actually.
All of the Flash Display/UI logic would have to be ported to CreateJS (or something like it).
Module loading should probably use established web technologies, instead.
Saving/loading save game files should probably be handled by `electron`.
And there is always a very plausible risk that something got lost in translation.

> **Q:&nbsp;** Can this be used to port other AS2 projects to the web?

**A:&nbsp;** Not out-of-the-box.
There's some hacky code that was written specifically with SM3.5 in mind.
But with some effort, it should be possible to adapt it to other projects.

## Getting started

You will need to install `git` and `npm` as recommended for your system. `npm` is a package manager for the nodejs ecosystem that you will use to install everything else.

```bash
git clone https://github.com/grumpy-cat-whatever/SM3.5-AS2-to-ES6-compiler.git
```

```bash
npm install
```

Currently, this will pull the SM3.5 sources from a hardcoded git repository and run the `default` gulp task (which generates ES6 code, then JavaScript code, and finally TypeScript code).
It takes a while to get done, and the shell will be full of lines beginning in `Collecting:` or `Transforming:`.
You can stop the process by pressing `CTRL+C` in the shell.

You may want to install gulp-cli globally to run the main scripts:
```
npm -g gulp-cli
```

Afterwards you can run the following tasks:
* `gulp asToES6`: Will convert the SM3.5 sources to ES6 sources and write them to `dist/es6/`. Babel compile targets will be ignored for this step. See the `asToJs` task to compile against specific platforms.
* `gulp asToTs`: Will convert the SM3.5 sources to TypeScript sources and write them to `dist/ts/`. Babel compile targets will be ignored for this step.
* `gulp asToJs`: Will convert the SM3.5 sources to ES6 sources, and compile those to ES5 depending on which "supported browsers" are configured (you can change the default easily; see @babel/preset-env).

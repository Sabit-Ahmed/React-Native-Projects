## Steps
1. `npx react-native init rn7app --version 0.63`
2. Check rn7app in root directory, use the `package.json` and `yarn.lock` file to install necessary dependencies.
3. Configure files for react-native-unimodules from this link: https://docs.expo.io/bare/installing-unimodules/
4. Add following lines in android/build.gradle (for expo-camera):
    allprojects {
        repositories {

            // * Your other repositories here *

            // * Add a new maven block after other repositories / blocks *
            maven {
                // expo-camera bundles a custom com.google.android:cameraview
                url "$rootDir/../node_modules/expo-camera/android/maven"
            }
        }
    }
5. Edit your metro.config.js (If you want to load models with bundleResourceIO. You can instead load models from a webserver. This step is only needed if you want to use the bundleResourceIO loader). In this project, the lines in tfjs demo will be used in metro.config.js (See step 7).

    const { getDefaultConfig } = require('metro-config');
    module.exports = (async () => {
    const defaultConfig = await getDefaultConfig();
    const { assetExts } = defaultConfig.resolver;
    return {
        resolver: {
        // Add bin to assetExts
        assetExts: [...assetExts, 'bin'],
        }
    };
    })();

6. Rename a JavaScript file to be *.tsx
7. Use the `tsconfig.json`, `jest.config.js` and `metro.config.js` from the rn7app.
8. `yarn add compute-cosine-similarity`


#### Important Notes
Expo-camera does not have support for emulator, so test this project with real devices.
* Command for release build apk: `cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..`
* After release build, next time use `cd android && ./gradlew clean` to clean the files created when bundling. 
* And run `npx react-native run-android` for debug or `cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..` for release.
* The released apk from project created with `npx create-react-native-app appname` results in missing contents from assets folder. Instead use `npx react-native init rn7app`
* Latest version (0.64) creates problem when generating the project for the first time. Older version is used in this case.
* `expo-image-picker` package created issue in this project, but it worked perfectly in previous projects.


### Demo App (Android)
![Output sample](https://github.com/ajasmin/camstudio-mousedown-highlight/raw/master/android_vid_test.gif)



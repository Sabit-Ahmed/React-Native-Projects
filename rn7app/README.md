## Steps
1. `npx react-native init rn7app --version 0.63`
2. `yarn add react-native-unimodules expo-gl-cpp expo-gl expo-camera jpeg-js @react-native-community/async-storage react-native-fs expo-permissions expo-file-system @tensorflow/tfjs @tensorflow/tfjs-react-native`
3. Configure files for react-native-unimodules from this link: https://docs.expo.io/bare/installing-unimodules/
4. `react-native link react-native-fs`
5. Add following lines in android/build.gradle (for expo-camera):
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
6. Edit your metro.config.js (If you want to load models with bundleResourceIO. You can instead load models from a webserver. This step is only needed if you want to use the bundleResourceIO loader). In this project, the lines in tfjs demo will be used in metro.config.js (See step 7).

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


#### For this project
* If you want to use TypeScript in your project:
i.  Add TypeScript and the types for React Native and Jest to your project.
    `yarn add -D typescript @types/jest @types/react @types/react-native @types/react-test-renderer`
ii.  Add a TypeScript config file. Create a tsconfig.json in the root of your project:
    {
        "compilerOptions": {
            "allowJs": true,
            "allowSyntheticDefaultImports": true,
            "esModuleInterop": true,
            "isolatedModules": true,
            "jsx": "react",
            "lib": ["es6"],
            "moduleResolution": "node",
            "noEmit": true,
            "strict": true,
            "target": "esnext"
        },
        "exclude": [
            "node_modules",
            "babel.config.js",
            "metro.config.js",
            "jest.config.js"
        ]
    }
iii. Create a jest.config.js file to configure Jest to use TypeScript:
    module.exports = {
        preset: 'react-native',
        moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
    };
iv. Rename a JavaScript file to be *.tsx (Not index.js)
v.  Run `yarn tsc` to type-check your new TypeScript files.

7.  Add ".png" in metro.config.js in the resolver:
    assetExts: ['bin', 'txt', 'jpg', 'png']

(Replace the metro.config.js with the following codes):

    const blacklist = require('metro-config/src/defaults/blacklist');
    module.exports = {
        transformer: {
            getTransformOptions: async () => ({
                transform: {
                    experimentalImportSupport: false,
                    inlineRequires: false,
                },
            }),
        },
        resolver: {
            assetExts: ['bin', 'txt', 'jpg', 'png'],
            sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
            blacklistRE: blacklist([/platform_node/])
        },
    };

8.  `yarn add @tensorflow-models/blazeface @tensorflow-models/mobilenet @tensorflow-models/posenet expo-image-manipulator jasmine-core react-native-svg react-native-web rn-fetch-blob`


#### Important Notes
Expo-camera does not have support for emulator, so test this project with real devices.
* Command for release build apk: `cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..`
* After release build, next time use `cd android && ./gradlew clean` to clean the files created when bundling. 
* And run `npx react-native run-android` for debug or `cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..` for release.
* The released apk from project created with `npx create-react-native-app appname` results in missing contents from assets folder. Instead use `npx react-native init rn7app`
* Latest version (0.64) creates problem when generating the project for the first time. Older version is used in this case.
* `expo-image-picker` package created issue in this project, but it worked perfectly in previous projects.

#### Deprecated solutions below:
9.  `react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/`
10. `gradle assemblerelease`

#### gradle installation steps: 
11. Make executables `source /etc/profile.d/gradle.sh`
https://linuxize.com/post/how-to-install-gradle-on-ubuntu-20-04/
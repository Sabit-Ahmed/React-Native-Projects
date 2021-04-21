# rn3app: Bare React-Native Project Demo with PyTorch to TensorFlow.js converted model on Fashion MNIST Dataset 

Build another app with less effort:

## Steps:
### Step 1. Create your react native app.

You can use the React Native CLI or Expo.
This time command for creating the app: 

    `npx create-react-native-app` instead of `npx react-native init`.
This command automatically configures four files mentioned in installing the react-native-unimodules step.
On macOS (to develop iOS applications) You will also need to use CocoaPods to install these dependencies.   

### Step 2: Install dependencies

#### Install and configure `react-native-unimodules` (can be skipped if in an expo app)
No need to configure manually this time. Just install unimodules with: `yarn add react-native-unimodules`
#### Install and configure expo-gl-cpp and expo-gl
#### Install and configure expo-camera
Requires configuring android/build.gradle file like previous. The lines to add:

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

#### Install and configure async-storage
           It creates an issue: Doc says to install `@react-native-async-storage/async-storage`, but the project requires `@react-native-                     community/async-storage`. May be caused by expo libraries.
#### Install and configure react-native-fs
It requires modifying three files:

    1. android/settings.gradle
    2. android/app/build.gradle
    3. MainApplication.java ----> Just import  com.rnfs.RNFSPackage will do the work!
  
#### Install @tensorflow/tfjs - npm install @tensorflow/tfjs
#### Install @tensorflow/tfjs-react-native - npm install @tensorflow/tfjs-react-native
#### Install expo-permissions, expo-file-system, expo-image-picker
No need to install expo-constants. It is already there!
### Just add these lines in <application></application>  in AndroidManifest.xml:
    <activity
      android:name="com.theartofdev.edmodo.cropper.CropImageActivity"
      android:theme="@style/Base.Theme.AppCompat">
    </activity>
Paste the code from previously written app in App.js. Don't use the sample from tfjs-react-native docs, they don't work for some reason.
Now just host the model with `http-server -c1 --cors` and enjoy!

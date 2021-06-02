/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

// module.exports = {
//   transformer: {
//     getTransformOptions: async () => ({
//       transform: {
//         experimentalImportSupport: false,
//         inlineRequires: false,
//       },
//     }),
//   },
// };

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

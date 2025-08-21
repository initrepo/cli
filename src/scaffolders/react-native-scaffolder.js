/**
 * React Native Scaffolder
 * 
 * Creates a React Native project structure with Expo or bare React Native setup.
 */

import { BaseScaffolder } from './base-scaffolder.js';
import { execSync } from 'child_process';

export class ReactNativeScaffolder extends BaseScaffolder {
  constructor(options) {
    super(options);
    this.useExpo = options.expo !== false;
    this.useTypeScript = options.typescript !== false;
    this.template = options.template || 'tabs';
  }

  async scaffold() {
    this.createPackageJson();
    
    if (this.useTypeScript) {
      this.createTypeScriptConfig();
    }
    
    if (this.architecture?.structure) {
      this.createStructureFromArchitecture();
    } else {
      this.createDefaultStructure();
    }
    
    this.createEssentialFiles();
    this.createExpoConfig();
  }

  createDefaultStructure() {
    const dirs = [
      'src',
      'src/components',
      'src/screens',
      'src/navigation',
      'src/services',
      'src/utils',
      'src/hooks',
      'src/types',
      'src/constants',
      'assets',
      'assets/images',
      'assets/fonts',
      'assets/icons'
    ];

    dirs.forEach(dir => this.createDirectory(dir));
    this.createSourceFiles();
  }

  createPackageJson() {
    const packageJson = {
      name: this.getProjectNames().kebab,
      version: "1.0.0",
      main: this.useExpo ? "node_modules/expo/AppEntry.js" : "index.js",
      scripts: {
        start: this.useExpo ? "expo start" : "react-native start",
        android: this.useExpo ? "expo start --android" : "react-native run-android",
        ios: this.useExpo ? "expo start --ios" : "react-native run-ios",
        web: this.useExpo ? "expo start --web" : undefined,
        ...(this.useExpo && {
          "build:android": "expo build:android",
          "build:ios": "expo build:ios"
        }),
        ...(this.useTypeScript && {
          "type-check": "tsc --noEmit"
        })
      },
      dependencies: {
        react: "18.2.0",
        "react-native": "0.72.6",
        ...(this.useExpo && {
          expo: "~49.0.15",
          "@expo/vector-icons": "^13.0.0",
          "expo-font": "~11.4.0",
          "expo-linking": "~5.0.2",
          "expo-router": "^2.0.0",
          "expo-splash-screen": "~0.20.5",
          "expo-status-bar": "~1.6.0",
          "expo-system-ui": "~2.4.0"
        }),
        "@react-navigation/native": "^6.1.9",
        "@react-navigation/native-stack": "^6.9.17",
        "@react-navigation/bottom-tabs": "^6.5.11",
        "react-native-safe-area-context": "4.6.3",
        "react-native-screens": "~3.22.0"
      },
      devDependencies: {
        "@babel/core": "^7.20.0",
        ...(this.useTypeScript && {
          typescript: "^5.1.3",
          "@types/react": "~18.2.14",
          "@types/react-native": "^0.72.2"
        })
      },
      private: true
    };

    this.writeFile('package.json', JSON.stringify(packageJson, null, 2));
  }

  createTypeScriptConfig() {
    const tsConfig = {
      extends: "@expo/tsconfig/tsconfig.base",
      compilerOptions: {
        strict: true,
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"]
        }
      },
      include: [
        "**/*.ts",
        "**/*.tsx",
        ".expo/types/**/*.ts",
        "expo-env.d.ts"
      ]
    };

    this.writeFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));
  }

  createExpoConfig() {
    if (!this.useExpo) return;

    const appConfig = `import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '${this.projectName}',
  slug: '${this.getProjectNames().kebab}',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: '${this.getProjectNames().kebab}',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.${this.getProjectNames().kebab.replace(/-/g, '')}.app'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.${this.getProjectNames().kebab.replace(/-/g, '')}.app'
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png'
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff'
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
});
`;

    this.writeFile(`app.config.${this.useTypeScript ? 'ts' : 'js'}`, appConfig);
  }

  createSourceFiles() {
    const fileExt = this.useTypeScript ? 'tsx' : 'jsx';
    
    if (this.useExpo) {
      this.createExpoRouterFiles(fileExt);
    } else {
      this.createReactNavigationFiles(fileExt);
    }
    
    this.createComponentFiles(fileExt);
  }

  createExpoRouterFiles(fileExt) {
    // App entry point for Expo Router
    const layoutContent = `import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
`;

    this.writeFile(`app/_layout.${fileExt}`, layoutContent);

    // Tab layout
    const tabLayoutContent = `import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';

import Colors from '../../src/constants/Colors';

function TabBarIcon(props${this.useTypeScript ? ': { name: React.ComponentProps<typeof FontAwesome>[\'name\']; color: string }' : ''}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
`;

    this.writeFile(`app/(tabs)/_layout.${fileExt}`, tabLayoutContent);

    // Home screen
    const homeScreenContent = `import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '../../src/components/Themed';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to ${this.projectName}</Text>
        <Text style={styles.subtitle}>Generated with InitRepo CLI</Text>
        
        <View style={styles.separator} />
        
        <Text style={styles.description}>
          This is a React Native app built with Expo Router. 
          You can start building your amazing mobile app here!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: '#eee',
  },
});
`;

    this.writeFile(`app/(tabs)/index.${fileExt}`, homeScreenContent);

    // Settings screen
    const settingsScreenContent = `import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '../../src/components/Themed';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.description}>
          Configure your app settings here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
});
`;

    this.writeFile(`app/(tabs)/settings.${fileExt}`, settingsScreenContent);
  }

  createReactNavigationFiles(fileExt) {
    // App.js for bare React Native
    const appContent = `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
`;

    this.writeFile(`App.${fileExt}`, appContent);

    // Home screen
    const homeScreenContent = `import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to ${this.projectName}</Text>
        <Text style={styles.subtitle}>Generated with InitRepo CLI</Text>
        <Text style={styles.description}>
          This is a React Native app. You can start building your amazing mobile app here!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#333',
  },
});
`;

    this.writeFile(`src/screens/HomeScreen.${fileExt}`, homeScreenContent);

    // Settings screen
    const settingsScreenContent = `import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.description}>
          Configure your app settings here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});
`;

    this.writeFile(`src/screens/SettingsScreen.${fileExt}`, settingsScreenContent);
  }

  createComponentFiles(fileExt) {
    // Themed components for Expo
    if (this.useExpo) {
      const themedContent = `import { Text as DefaultText, View as DefaultView, useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

${this.useTypeScript ? `type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}` : ''}

export function Text(props${this.useTypeScript ? ': TextProps' : ''}) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props${this.useTypeScript ? ': ViewProps' : ''}) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
`;

      this.writeFile(`src/components/Themed.${fileExt}`, themedContent);

      // Colors constants
      const colorsContent = `const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
`;

      this.writeFile(`src/constants/Colors.${this.useTypeScript ? 'ts' : 'js'}`, colorsContent);
    }
  }

  createEssentialFiles() {
    // README
    const readme = `# ${this.projectName}

A React Native mobile app generated with InitRepo CLI.

## Tech Stack

- [React Native](https://reactnative.dev/) - Mobile framework
${this.useExpo ? '- [Expo](https://expo.dev/) - Development platform\n- [Expo Router](https://expo.github.io/router/) - File-based routing\n' : ''}${this.useTypeScript ? '- [TypeScript](https://www.typescriptlang.org/) - Type safety\n' : ''}- [React Navigation](https://reactnavigation.org/) - Navigation library

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   ${this.useExpo ? 'npx expo start' : 'npm start'}
   \`\`\`

3. Run on your device or emulator:
   - **iOS**: ${this.useExpo ? 'Press \`i\` in the terminal or scan QR code with Camera app' : '\`npm run ios\`'}
   - **Android**: ${this.useExpo ? 'Press \`a\` in the terminal or scan QR code with Expo Go app' : '\`npm run android\`'}

## Development

${this.useExpo ? `### Using Expo
- Download the Expo Go app on your phone
- Scan the QR code from the terminal
- Your app will reload when you save changes

### Building for Production
\`\`\`bash
npx expo build:android
npx expo build:ios
\`\`\`
` : `### Running on Simulators
Make sure you have Android Studio (for Android) or Xcode (for iOS) installed.

\`\`\`bash
# Android
npm run android

# iOS (macOS only)
npm run ios
\`\`\`
`}

## Project Structure

${this.useExpo ? `- \`app/\` - App Router pages and layouts
- \`src/components/\` - Reusable React Native components
- \`src/constants/\` - App constants and themes
- \`assets/\` - Images, fonts, and other static assets` : `- \`src/screens/\` - App screens
- \`src/components/\` - Reusable React Native components
- \`src/navigation/\` - Navigation configuration
- \`src/services/\` - API and external services`}

## Learn More

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
${this.useExpo ? '- [Expo Documentation](https://docs.expo.dev/)\n- [Expo Router Documentation](https://expo.github.io/router/)' : '- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)'}
`;

    this.writeFile('README.md', readme);

    // Babel config
    const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`;

    this.writeFile('babel.config.js', babelConfig);

    // Metro config for Expo
    if (this.useExpo) {
      const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
`;

      this.writeFile('metro.config.js', metroConfig);
    }

    // Index.js for bare React Native
    if (!this.useExpo) {
      const indexContent = `import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './package.json';

AppRegistry.registerComponent(appName, () => App);
`;

      this.writeFile('index.js', indexContent);
    }
  }

  supportsDependencyInstallation() {
    return true;
  }

  async installDependencies() {
    try {
      process.chdir(this.targetDirectory);
      execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
      this.log('Failed to install dependencies: ' + error.message, 'warning');
    }
  }

  getNextSteps() {
    const steps = [];
    
    if (this.useExpo) {
      steps.push('npx expo start');
      steps.push('Download Expo Go app on your phone');
      steps.push('Scan the QR code to run your app');
    } else {
      steps.push('npm start');
      steps.push('npm run android (or npm run ios)');
    }
    
    return steps;
  }

  getDefaultGitignore() {
    return `# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# Generated by 'expo optimize'
.expo-optimized/

# Expo
.expo/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo
`;
  }
}
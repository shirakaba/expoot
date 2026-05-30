<h1 align="center">Expo Desktop 🖥️</h2>

# About

Best-effort support for using Expo with desktop platforms [react-native-macos](https://github.com/microsoft/react-native-macos) and [react-native-windows](https://github.com/microsoft/react-native-windows).

# Usage instructions

```sh
npx expo-desktop create-app
```

When entering the project directory, you'll have a diff of the changes expo-desktop has made relative to a clean expo app.
Note that since prebuild is not yet implemented for desktop, the best course of action is to let `/macos` and `/windows` live in your repo for the time being.

You can run the macos and Windows versions as per `package.json` scripts just like native mobile:

```sh
bun run macos
bun run windows
```

import "react-native-url-polyfill/auto";

import React from "react";
import { StatusBar } from "expo-status-bar";
import RegisterPassengerScreen from "./src/auth/RegisterPassengerScreen";

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <RegisterPassengerScreen />
    </>
  );
}

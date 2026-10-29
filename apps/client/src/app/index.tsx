import { Text, View } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-bg px-6">
      <Text className="font-sans-extrabold text-4xl text-primary">
        Boomerang
      </Text>
      <Text className="font-sans text-base text-muted">
        Returns, picked up.
      </Text>
    </View>
  );
}

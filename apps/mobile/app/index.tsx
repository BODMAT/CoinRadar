import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CoinRadar</Text>
      <Text style={styles.subtitle}>Mobile — clean start</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { marginTop: 8, opacity: 0.6 },
});

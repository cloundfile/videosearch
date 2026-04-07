import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';

export default function Loader({ message }: { message?: string }) {
    message = message || 'Loading...';
    const { colors } = useTheme();
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.notification} />
            <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        flex: 1,
        gap: 12
    },
    message: {
        fontSize: 16,
        fontWeight: 'bold'
    }
});
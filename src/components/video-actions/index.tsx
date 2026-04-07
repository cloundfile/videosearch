import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { IconDownload, IconMusic, IconFileText } from '@tabler/icons-react-native';

interface VideoActionsProps {
    onDownload?: () => void;
    onAudio?: () => void;
    onTranscribe?: () => void;
    loadingType?: 'video' | 'music' | 'transcript' | null;
    progress?: number;
    status?: string;
}

const VideoActions: React.FC<VideoActionsProps> = ({
    onDownload,
    onAudio,
    onTranscribe,
    loadingType,
    progress,
    status
}) => {
    const { colors } = useTheme();

    const isAnyLoading = loadingType !== null;

    const renderButton = (
        type: 'video' | 'music' | 'transcript',
        isLoading: boolean,
        label: string,
        Icon: any,
        onPress?: () => void
    ) => {
        const buttonLabel = isLoading && status ? status : label;

        return (
            <TouchableOpacity
                style={[
                    styles.actionButton,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isLoading && { borderColor: colors.primary }
                ]}
                onPress={onPress}
                disabled={isAnyLoading}
                activeOpacity={0.7}
            >
                <Icon
                    size={20}
                    color={isLoading ? colors.primary : colors.text}
                />
                <Text
                    style={[
                        styles.label,
                        { color: colors.text }
                    ]}
                >
                    {buttonLabel}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {renderButton('video', loadingType === 'video', 'Download Video', IconDownload, onDownload)}
            {renderButton('music', loadingType === 'music', 'Download Audio', IconMusic, onAudio)}
            {renderButton('transcript', loadingType === 'transcript', 'Transcribe', IconFileText, onTranscribe)}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    label: {
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default VideoActions;

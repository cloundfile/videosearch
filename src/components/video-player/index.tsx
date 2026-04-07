import YoutubePlayer from 'react-native-youtube-iframe';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import { IconVideo } from '@tabler/icons-react-native';
import { useState, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

type Props = {
    videoId: string;
    style?: any;
    backgroundColor?: string;
    onVideoEnd?: () => void;
    isVertical?: boolean;
};

const { width: screenWidth } = Dimensions.get('window');

export default function VideoPlayer({ videoId, style, backgroundColor, onVideoEnd, isVertical }: Props) {
    const [layoutWidth, setLayoutWidth] = useState(screenWidth - 32);
    const videoHeight = (layoutWidth * 9) / 16;

    const onFullScreenChange = useCallback((isFullScreen: boolean) => {
        if (isFullScreen) {
            if (isVertical) {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } else {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            }
        } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
    }, [isVertical]);

    const onChangeState = useCallback((state: string) => {
        console.log('[VideoPlayer] State:', state);
        if (state === 'ended' && onVideoEnd) {
            onVideoEnd();
        }
    }, [onVideoEnd]);

    return (
        <View
            style={[styles.container, backgroundColor ? { backgroundColor } : null, style, { height: videoHeight }]}
            onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                if (width > 0) setLayoutWidth(width);
            }}
        >
            {videoId ? (
                <YoutubePlayer
                    key={videoId} // Force remount for reliable auto-play
                    height={videoHeight}
                    width={layoutWidth}
                    play={true}
                    videoId={videoId}
                    onChangeState={onChangeState}
                    onFullScreenChange={onFullScreenChange}
                    forceAndroidAutoplay={true}
                    initialPlayerParams={{
                        loop: false,
                        preventFullScreen: false,
                        controls: true,
                        showClosedCaptions: true,
                    }}
                    webViewProps={{
                        mediaPlaybackRequiresUserAction: false,
                        allowsInlineMediaPlayback: true,
                        javaScriptEnabled: true,
                        domStorageEnabled: true,
                    }}
                    onError={(e: any) => console.error('[VideoPlayer] Error:', e)}
                />
            ) : (
                <View style={[styles.placeholder, { height: videoHeight }]}>
                    <IconVideo size={48} />
                    <Text style={styles.placeholderText}>Aguardando seleção de vídeo...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    }
});

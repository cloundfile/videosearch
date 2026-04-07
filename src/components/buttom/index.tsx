import React from 'react';
import { useTheme } from '@react-navigation/native';
import {
    TouchableOpacity,
    ActivityIndicator,
    GestureResponderEvent,
} from 'react-native';
import { styles } from './styles';

type Props = {
    onPress: (event: GestureResponderEvent) => void;
    loading?: boolean;
    disabled?: boolean;
    icon: React.ReactElement;
    color?: string;
    size?: number;
};

const SubmitButtonIcon = ({
    onPress,
    loading = false,
    disabled = false,
    icon,
    color,
    size,
}: Props) => {
    const { colors } = useTheme();
    const iconColor = color || colors.text;
    const iconSize = size || 24;

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    backgroundColor: disabled ? colors.primary : colors.border,
                },
            ]}
            activeOpacity={0.8}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color={colors.notification} />
            ) : (
                React.cloneElement(icon as React.ReactElement<any>, {
                    color: iconColor,
                    size: iconSize,
                })
            )}
        </TouchableOpacity>
    );
};

export default SubmitButtonIcon;

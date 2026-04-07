import { useTheme } from '@react-navigation/native';
import { TextInput, View, } from 'react-native';
import React, { useState } from 'react';

import { styles } from './styles';

const InputText = ({ ...props }) => {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, { backgroundColor: colors.border }, props.style]} >
            <TextInput
                placeholderTextColor={colors.text}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                {...props}
                style={
                    [
                        styles.placeholder,
                        {
                            borderColor: isFocused
                                ? colors.primary
                                : colors.border,
                            color: colors.text,
                        },
                        props.style,
                    ]}
                onFocus={(e) => {
                    setIsFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    props.onBlur?.(e);
                }}
            />
        </View>
    );
};

export default InputText;

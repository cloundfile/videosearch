
import { View, TextInputProps, GestureResponderEvent } from 'react-native';
import { IconSearch } from '@tabler/icons-react-native';
import InputText from '@/components/input-text';

import SubmitButton from '@/components/buttom';
import { styles } from './styles';

type Props = {
    input: TextInputProps & { key?: string };
    button: {
        title: string;
        onPress: (event: GestureResponderEvent) => void;
        loading?: boolean;
        disabled?: boolean;
    };
}

const InputPanel = ({ input, button }: Props) => {
    return (
        <View style={styles.container}>
            <InputText {...input} />
            <SubmitButton
                icon={<IconSearch />}
                onPress={button.onPress}
                loading={button.loading}
                disabled={button.disabled}
            />
        </View>
    );
};



export default InputPanel;

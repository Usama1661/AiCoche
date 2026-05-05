import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';

import { triggerLightHaptic } from '@/src/lib/haptics';

type Props = PressableProps & {
  haptic?: boolean;
};

export function HapticPressable({
  haptic = true,
  disabled,
  onPress,
  ...props
}: Props) {
  function handlePress(event: GestureResponderEvent) {
    if (haptic && !disabled) {
      triggerLightHaptic();
    }
    onPress?.(event);
  }

  return <Pressable {...props} disabled={disabled} onPress={handlePress} />;
}

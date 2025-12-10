import { AvatarProps, Flex, Avatar } from "@radix-ui/themes";
import { EmoteProviders } from "../util";

function getProviderIcon(provider: EmoteProviders): string {
    switch (provider) {
        case "Twitch":
            return "https://twitch.tv/favicon.ico";
        case "SevenTV":
            return "https://7tv.app/favicon.svg";
        case "BTTV":
            return "https://betterttv.com/favicon.png";
        case "FFZ":
            return "https://www.frankerfacez.com/static/images/favicon-192.png";
        default:
            return "";
    }
}

interface ProviderIconProps extends AvatarProps {
    provider: EmoteProviders;
    align?: "right" | "left"
}

export default function ProviderIcon({ size, children, fallback, provider, align = 'left' }: ProviderIconProps) {

    return <Flex gap={'1'} align={'center'}>
        <Avatar
            src={getProviderIcon(provider)}
            fallback={fallback.toString()[0]}
            size={size ?? '1'}
            className={align ? "order-first" : "order-last"}
        />
        {provider}
    </Flex>
}
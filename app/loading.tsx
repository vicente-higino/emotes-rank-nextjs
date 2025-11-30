import { Box, Flex, Spinner } from "@radix-ui/themes";

export default function Loading() {
  // Or a custom loading skeleton component
  return <Flex minHeight={"100vh"} align="center" justify="center">
    <Spinner size="3"/>
  </Flex>
}
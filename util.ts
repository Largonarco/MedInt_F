import { enqueueSnackbar } from "notistack";

export function alertUser(
  message: string,
  variant: "default" | "error" | "success" | "warning" | "info"
) {
  enqueueSnackbar(message, {
    variant,
    preventDuplicate: true,
    autoHideDuration: 3000,
    anchorOrigin: {
      vertical: "bottom",
      horizontal: "right",
    },
  });
}

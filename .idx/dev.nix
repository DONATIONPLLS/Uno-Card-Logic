{ pkgs, ... }: {
  channel = "stable-23.11";
  packages = [
    pkgs.nodejs_20
    pkgs.pnpm
    pkgs.android-sdk
  ];
  previews = [
    {
      command = "pnpm run dev";
      manager = "web";
    }
  ];
}

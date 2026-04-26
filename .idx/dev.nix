{ pkgs, ... }: {
  channel = "stable-23.11";

  packages = [
    pkgs.nodejs_20
    pkgs.pnpm
  ];

  idx = {
    extensions = [];

    previews = {
      enable = true;
      previews = {
        web = {
          command = [
            "pnpm"
            "dev"
            "--port"
            "$PORT"
            "--host"
            "0.0.0.0"
          ];
          manager = "web";
        };
      };
    };

    workspace = {
      onCreate = {
        install = "pnpm install --no-frozen-lockfile";
      };
      onStart = {};
    };
  };
}

{ pkgs, ... }: {
  channel = "stable-23.11";

  packages = [
    pkgs.nodejs_20
    pkgs.corepack_21
  ];

  idx = {
    extensions = [];

    previews = {
      enable = true;
      previews = {
        web = {
          command = [
            "pnpm"
            "run"
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
        install = {
          command = "pnpm install";
          description = "Installing dependencies";
        };
      };
      onStart = {};
    };
  };
}

import android.os.Build;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;

private void hideSystemUI() {
    // 1. Handle older Android versions
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        getWindow().getDecorView().setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    } 
    // 2. Handle Android 11 (API 30) and newer
    else {
        WindowInsetsController controller = getWindow().getInsetsController();
        if (controller != null) {
            // Hide both Status and Navigation bars
            controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            // Make them appear/disappear with a swipe from the edge
            controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
    
    // Ensure the layout stays stable behind the bars
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        getWindow().getAttributes().layoutInDisplayCutoutMode = 
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
    }
}

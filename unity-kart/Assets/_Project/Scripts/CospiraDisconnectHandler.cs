public class CospiraDisconnectHandler : MonoBehaviour
{
    void Start()
    {
        NetworkManager.Singleton.OnClientDisconnectCallback += OnClientDisconnected;
    }

    private void OnClientDisconnected(ulong clientId)
    {
        if (clientId == NetworkManager.Singleton.LocalClientId)
        {
            // Local client disconnected, perhaps host left
            CospiraJsBridge.SendExit();
        }
    }
}
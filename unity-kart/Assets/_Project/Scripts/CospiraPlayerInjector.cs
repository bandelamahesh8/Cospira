public class CospiraPlayerInjector : MonoBehaviour
{
    void Start()
    {
        NetworkManager.Singleton.OnClientConnectedCallback += OnClientConnected;
    }

    private void OnClientConnected(ulong clientId)
    {
        if (!NetworkManager.Singleton.IsHost) return;

        var player = GetNetworkPlayerForClient(clientId);
        if (player != null)
        {
            player.SetCospiraMetadataServerRpc(
                CospiraSessionData.Instance.GetPlayerData(clientId)
            );
        }
    }
}
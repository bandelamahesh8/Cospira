using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using Unity.Services.Relay;
using Unity.Services.Relay.Models;

public class CospiraRelayBridge : MonoBehaviour
{
    public static async Task<string> StartHostWithRelay(int maxPlayers)
    {
        Allocation allocation = await RelayService.Instance
            .CreateAllocationAsync(maxPlayers);

        string joinCode = await RelayService.Instance
            .GetJoinCodeAsync(allocation.AllocationId);

        var transport = NetworkManager.Singleton
            .GetComponent<UnityTransport>();

        transport.SetRelayServerData(
            allocation.RelayServer.IpV4,
            (ushort)allocation.RelayServer.Port,
            allocation.AllocationIdBytes,
            allocation.Key,
            allocation.ConnectionData
        );

        NetworkManager.Singleton.StartHost();
        return joinCode;
    }

    public static async Task JoinWithRelay(string joinCode)
    {
        JoinAllocation join = await RelayService.Instance
            .JoinAllocationAsync(joinCode);

        var transport = NetworkManager.Singleton
            .GetComponent<UnityTransport>();

        transport.SetRelayServerData(
            join.RelayServer.IpV4,
            (ushort)join.RelayServer.Port,
            join.AllocationIdBytes,
            join.Key,
            join.ConnectionData,
            join.HostConnectionData
        );

        NetworkManager.Singleton.StartClient();
    }
}
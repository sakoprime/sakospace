using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Unity companion for the browser experience. Attach this to the black hole trigger.
/// </summary>
[RequireComponent(typeof(Collider))]
public sealed class BlackHoleController : MonoBehaviour
{
    [SerializeField] private string destinationScene = "InsideSingularity";
    [SerializeField] private float pullStrength = 2f;
    [SerializeField] private float entryDistance = 4.1f;

    private void Reset()
    {
        GetComponent<Collider>().isTrigger = true;
    }

    private void OnTriggerStay(Collider other)
    {
        if (!other.CompareTag("Player"))
        {
            return;
        }

        Vector3 direction = transform.position - other.transform.position;
        Rigidbody body = other.attachedRigidbody;
        if (body != null)
        {
            body.AddForce(direction.normalized * pullStrength, ForceMode.Acceleration);
        }

        if (direction.magnitude <= entryDistance)
        {
            SceneManager.LoadScene(destinationScene);
        }
    }
}

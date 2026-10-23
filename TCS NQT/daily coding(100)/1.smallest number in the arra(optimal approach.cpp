#include <bits/stdc++.h>
using namespace std;

int main() {
	int arr[]={12,1,2,3,4};
	int n=sizeof(arr)/sizeof(arr[0]);
	int min=arr[0];
	for(int i=1;i<n;i++)
	{
	    if(arr[i]<min)
	    {
	        min=arr[i];
	    }
	    
	}
  cout<<" "<<min;
}

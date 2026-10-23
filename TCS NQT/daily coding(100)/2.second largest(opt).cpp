#include<bits/stdc++.h>
using namespace std;
 int largest(int arr[],int n)
 {
     int max=arr[0];
     for(int i=0;i<n;i++)
     {
         if(arr[i]>max)
         {
             max=arr[i];
         }
     }
     cout<<max;
     return max;
 }
 int main(){
     int arr[]={3,2,56,43,222,123,4};
     int n=sizeof(arr)/sizeof(arr[0]);
     largest(arr,n);
 }
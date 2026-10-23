#include <bits/stdc++.h>
using namespace std;
int sort_Array(vector <int> &arr)
{
    sort(arr.begin(), arr.end());
    return arr[0];
}

int main() {
vector<int> arr1={1,2,4,3};
cout<<"Sorted is "<<sort_Array(arr1);
}

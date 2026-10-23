#include<bits/stdc++.h>
using namespace std;
int sortArray(vector<int> &arr) {
    sort(arr.begin(), arr.end());
    return arr[arr.size()-1];
}
int main() {
    vector<int> arr={1,3,4,2,11,2};
    cout<<sortArray(arr);
}

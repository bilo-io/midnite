import{n as s,T as R}from"./iframe-DJr7qVNo.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-GvMHw0gE.js";import{P as H}from"./project-modal-BjlbSumd.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-bZvbO2wZ.js";import"./index-Dl4JnYVx.js";import"./check-Dt-62BLG.js";import"./triangle-alert-B0ot2rUY.js";import"./export-menu-DHvOc43v.js";import"./client-Dv1LRy6x.js";import"./markdown-preview-BiHh0Dwj.js";import"./file-text-BUe7PTSA.js";import"./copy-BM-gubhb.js";import"./loader-circle-CNyT3gS4.js";import"./api-A95bhGP6.js";import"./inbound-CbJZzwyX.js";import"./folder-open-CDLUVd45.js";import"./folder-DPtLpD5Y.js";import"./project-tag-bB-RAwE0.js";import"./tag-color-picker-Ph4QdwZF.js";import"./source-list-editor-CbX1o7CU.js";import"./source-icon-CZYHKUIe.js";import"./globe-DW0-XAJU.js";import"./sticky-note-BjV0VPoG.js";import"./plus-BUkWHpwP.js";import"./external-link-WX1qcCE-.js";import"./task-row-B6PXyo2y.js";import"./blocked-badge-B7FTUDKR.js";import"./selectable-icon-t4xopNAV.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CL77Ypbm.js";import"./pencil-DN81iz8s.js";import"./trash-2-Hfr4bbmI.js";import"./refresh-cw-DUQe2k9R.js";import"./index-C2gaUvt5.js";import"./lightbulb-D1zEPwuN.js";import"./templates-B6M1OYb3.js";import"./sparkles-Hwb-6odb.js";import"./brain-BWNMJhzL.js";import"./chevron-right-CpJxdig4.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,ja as __namedExportsOrder,ba as default};
